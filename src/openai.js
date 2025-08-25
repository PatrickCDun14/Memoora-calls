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

1. Validate that the caller's answer is appropriate and complete
2. Determine if we should proceed to the next question or ask for clarification
3. Provide a brief summary of their answer for context

Current question: ${question.prompt}
Caller's answer: ${answer}

Conversation context so far:
${contextSummary}

Respond in JSON format:
{
  "valid": true/false,
  "summary": "Brief summary of their answer",
  "should_proceed": true/false,
  "next_question_id": "q2" or null,
  "feedback": "Optional feedback or clarification request",
  "reasoning": "Brief explanation of your decision"
}`;

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
