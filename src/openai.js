// src/openai.js
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class OpenAIHelpers {
  constructor() {
    this.openai = null;
    this.apiKey = process.env.OPENAI_API_KEY;
    
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey
      });
    }
  }

  /**
   * Transcribe audio using Whisper
   */
  async transcribeAudio(audioFilePath) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not configured. Set OPENAI_API_KEY.');
      }

      console.log(`🎙️  Transcribing audio: ${audioFilePath}`);

      const audioFile = await fs.readFile(audioFilePath);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'text',
        language: 'en'
      });

      console.log(`✅ Transcription completed: "${transcription.substring(0, 100)}..."`);
      return transcription.trim();

    } catch (error) {
      console.error('❌ Whisper transcription failed:', error);
      throw error;
    }
  }

  /**
   * Analyze answer and determine next question using GPT-4o-mini
   */
  async analyzeAnswerAndDetermineNext(question, answer, conversationContext, flow) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not configured. Set OPENAI_API_KEY.');
      }

      console.log(`🧠 Analyzing answer for question: ${question.id}`);

      // Prepare context for AI
      const contextSummary = flow.getConversationSummary(conversationContext);
      
      const systemPrompt = `You are an AI assistant helping to conduct meaningful family story interviews. Your role is to:

1. Understand the caller's response in context
2. Determine if we should proceed to the next question or ask for clarification
3. Provide a brief summary of what they shared

IMPORTANT: Be VERY lenient and conversational. People often:
- Give contextual responses that make sense in conversation
- Don't answer questions exactly as asked (this is normal!)
- Share related information that's valuable
- Use natural speech patterns and filler words
- Restate things for clarity

Current question: ${question.prompt}
Caller's answer: ${answer}

Conversation context so far:
${contextSummary}

Respond in JSON format:
{
  "valid": true/false,
  "summary": "Brief summary of what they shared (extract the key information)",
  "should_proceed": true/false,
  "next_question_id": null,
  "feedback": "Optional feedback or clarification request (only if truly needed)",
  "reasoning": "Brief explanation of your decision"
}

Guidelines:
- If the answer is ANYTHING reasonable or related, mark as valid
- Only ask for clarification if the answer is completely incomprehensible
- Accept contextual responses, partial answers, and related information
- Remember: this is a conversation, not a test
- Be encouraging and supportive, not critical
- If they're sharing stories or memories, that's perfect - continue!
- IMPORTANT: Set next_question_id to null to let the system use the natural question flow`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this answer: "${answer}"` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Low temperature for consistent reasoning
        max_tokens: 300
      });

      const analysis = JSON.parse(completion.choices[0].message.content);
      
      // Safety check: if AI is being too strict, automatically continue
      if (!analysis.valid && analysis.feedback && analysis.feedback.toLowerCase().includes('name')) {
        console.log('🔄 AI being too strict about name requirement, overriding to continue...');
        analysis.valid = true;
        analysis.should_proceed = true;
        analysis.next_question_id = question.next;
        analysis.feedback = null;
        analysis.reasoning = 'Overridden: AI was too strict, accepting contextual response';
      }
      
      console.log(`✅ AI analysis completed:`, {
        valid: analysis.valid,
        should_proceed: analysis.should_proceed,
        next_question: analysis.next_question_id
      });

      return analysis;

    } catch (error) {
      console.error('❌ GPT-4o-mini analysis failed:', error);
      
      // Fallback: basic validation and continue to next question
      return {
        valid: true,
        summary: answer.substring(0, 100) + '...',
        should_proceed: true,
        next_question_id: question.next,
        feedback: null,
        reasoning: 'Fallback: proceeding due to AI service error'
      };
    }
  }

  /**
   * Generate conversation summary
   */
  async generateConversationSummary(conversationContext, flow) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not configured. Set OPENAI_API_KEY.');
      }

      console.log(`📝 Generating conversation summary`);

      const contextSummary = flow.getConversationSummary(conversationContext);
      
      const systemPrompt = `You are summarizing a family story interview. Create a warm, engaging summary of what the caller shared.

What they shared:
${contextSummary}

Generate a 2-3 sentence summary that captures the essence of their stories and memories. Make it personal and warm.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Summarize this conversation.' }
        ],
        temperature: 0.5,
        max_tokens: 200
      });

      const summary = completion.choices[0].message.content.trim();
      
      console.log(`✅ Conversation summary generated: "${summary.substring(0, 100)}..."`);
      
      return summary;

    } catch (error) {
      console.error('❌ Failed to generate conversation summary:', error);
      return 'Thank you for sharing your family stories and memories with us today.';
    }
  }

  /**
   * Generate dynamic, contextual questions based on conversation content
   */
  async generateDynamicQuestion(conversationContext, currentStory, flow) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not configured. Set OPENAI_API_KEY.');
      }

      console.log(`🧠 Generating dynamic question based on story context...`);

      const contextSummary = flow.getConversationSummary(conversationContext);
      
      const systemPrompt = `You are a warm, engaging interviewer helping someone share their family stories and memories. 

Your role is to generate ONE natural, contextual question that will help them continue sharing their story.

What they've shared so far:
${contextSummary}

Current story/memory they're telling:
${currentStory}

Generate a question that:
- Feels natural and conversational (not like an interview)
- Builds on what they just shared
- Encourages them to continue their story
- Shows genuine interest and curiosity
- Is specific to their experience

Examples of good questions:
- "That sounds amazing! What happened next?"
- "How did that make you feel at the time?"
- "What was your grandmother like? She sounds wonderful."
- "That must have been challenging. How did you get through it?"
- "Can you tell me more about that moment?"

Respond with just the question - no JSON, no explanation, just the natural question.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate a natural follow-up question based on their story.' }
        ],
        temperature: 0.7, // Higher temperature for more creative, natural questions
        max_tokens: 100
      });

      const question = completion.choices[0].message.content.trim();
      
      console.log(`✅ Dynamic question generated: "${question}"`);
      
      return question;

    } catch (error) {
      console.error('❌ Failed to generate dynamic question:', error);
      
      // Fallback to generic but warm questions
      const fallbackQuestions = [
        "That's wonderful! Can you tell me more about that?",
        "What happened next in your story?",
        "How did that experience shape you?",
        "What was the most meaningful part of that memory?",
        "Can you share another story with me?"
      ];
      
      const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      console.log(`🔄 Using fallback question: "${randomQuestion}"`);
      
      return randomQuestion;
    }
  }

  // Note: shouldUseDynamicQuestions is now handled in src/flow.js
  // This function was removed to avoid conflicts

  /**
   * Check if OpenAI is available
   */
  isAvailable() {
    return !!this.openai && !!this.apiKey;
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      available: this.isAvailable(),
      hasApiKey: !!this.apiKey,
      hasClient: !!this.openai
    };
  }
}

module.exports = OpenAIHelpers;