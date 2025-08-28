// src/flow.js
const fs = require('fs').promises;
const path = require('path');

class ConversationFlow {
  constructor() {
    this.questions = [];
    this.questionMap = new Map();
    this.loaded = false;
  }

  /**
   * Load questions from questions.json
   */
  async loadQuestions() {
    try {
      const questionsPath = path.join(__dirname, '..', 'questions.json');
      const questionsData = await fs.readFile(questionsPath, 'utf8');
      this.questions = JSON.parse(questionsData);
      
      // Create a map for quick question lookup
      this.questions.forEach(question => {
        this.questionMap.set(question.id, question);
      });
      
      this.loaded = true;
      console.log(`✅ Loaded ${this.questions.length} conversation questions`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load questions:', error);
      return false;
    }
  }

  /**
   * Get a question by ID
   */
  getQuestion(questionId) {
    if (!this.loaded) {
      throw new Error('Questions not loaded. Call loadQuestions() first.');
    }
    return this.questionMap.get(questionId);
  }

  /**
   * Get the first question
   */
  getFirstQuestion() {
    return this.getQuestion('q1');
  }

  /**
   * Get the next question based on current question and context
   */
  getNextQuestion(currentQuestionId, context = {}) {
    const currentQuestion = this.getQuestion(currentQuestionId);
    if (!currentQuestion) {
      throw new Error(`Question ${currentQuestionId} not found`);
    }

    // If this is the end, return null
    if (currentQuestion.next === null || currentQuestion.next === 'end') {
      return null;
    }

    // Get the next question
    const nextQuestion = this.getQuestion(currentQuestion.next);
    if (!nextQuestion) {
      throw new Error(`Next question ${currentQuestion.next} not found`);
    }

    // Replace context variables in the prompt
    const processedPrompt = this.processPrompt(nextQuestion.prompt, context);
    
    return {
      ...nextQuestion,
      prompt: processedPrompt
    };
  }

  /**
   * Get the best next question dynamically based on context and conversation flow
   */
  getBestNextQuestion(currentQuestionId, context = {}, timeRemaining = null) {
    const currentQuestion = this.getQuestion(currentQuestionId);
    if (!currentQuestion) {
      throw new Error(`Question ${currentQuestionId} not found`);
    }

    // If this is the end, return null
    if (currentQuestion.next === null || currentQuestion.next === 'end') {
      return null;
    }

    // Check if we should use dynamic question selection
    if (this.shouldUseDynamicQuestions(context, currentQuestionId)) {
      return this.selectDynamicQuestion(context, timeRemaining);
    }

    // For q1, we now use dynamic selection after getting the answer
    // This should not happen in normal flow, but as a fallback
    const nextQuestion = this.getQuestion(currentQuestion.next);
    if (!nextQuestion) {
      throw new Error(`Next question ${currentQuestion.next} not found`);
    }

    // Replace context variables in the prompt
    const processedPrompt = this.processPrompt(nextQuestion.prompt, context);
    
    return {
      ...nextQuestion,
      prompt: processedPrompt
    };
  }

  /**
   * Select the best dynamic question based on context and time remaining
   */
  selectDynamicQuestion(context, timeRemaining) {
    console.log('🧠 Selecting dynamic question based on context and time...');
    
    // Get all available questions (excluding only q1 and end)
    const availableQuestions = this.questions.filter(q => 
      !['q1', 'end'].includes(q.id) && 
      q.type !== 'closing'
    );

    // If no time remaining, end the conversation gracefully
    if (timeRemaining !== null && timeRemaining <= 0) {
      console.log('⏰ No time remaining, ending conversation gracefully');
      return this.getQuestion('end');
    }

    // Score questions based on context relevance and time efficiency
    const scoredQuestions = availableQuestions.map(question => {
      let score = 0;
      
      // Base score for question type
      score += this.getQuestionTypeScore(question);
      
      // Context relevance score
      score += this.getContextRelevanceScore(question, context);
      
      // Time efficiency score (shorter questions get higher scores when time is limited)
      if (timeRemaining !== null && timeRemaining < 2) {
        score += this.getTimeEfficiencyScore(question, timeRemaining);
      }
      
      // Avoid recently asked questions
      if (context.answers && context.answers[question.id]) {
        score -= 100; // Heavy penalty for already asked questions
      }
      
      return { question, score };
    });

    // Sort by score (highest first) and select the best
    scoredQuestions.sort((a, b) => b.score - a.score);
    
    console.log('📊 Question scores:', scoredQuestions.map(q => 
      `${q.question.id}: ${q.score}`
    ));

    const bestQuestion = scoredQuestions[0];
    if (!bestQuestion) {
      console.log('❌ No suitable questions found, ending conversation');
      return this.getQuestion('end');
    }

    console.log(`✅ Selected dynamic question: ${bestQuestion.question.id} (score: ${bestQuestion.score})`);
    
    // Replace context variables in the prompt
    const processedPrompt = this.processPrompt(bestQuestion.question.prompt, context);
    
    return {
      ...bestQuestion.question,
      prompt: processedPrompt
    };
  }

  /**
   * Process prompt template with context variables
   */
  processPrompt(prompt, context) {
    let processedPrompt = prompt;
    
    // Replace {{variable}} with context values
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      if (processedPrompt.includes(placeholder)) {
        processedPrompt = processedPrompt.replace(new RegExp(placeholder, 'g'), value);
      }
    });
    
    return processedPrompt;
  }

  /**
   * Validate an answer based on question validation rules
   */
  validateAnswer(question, answer) {
    if (!question.validation) {
      return { valid: true, message: null };
    }

    switch (question.validation) {
      case 'not_empty':
        if (!answer || answer.trim().length === 0) {
          return { 
            valid: false, 
            message: 'Please provide an answer. I didn\'t catch that.' 
          };
        }
        break;
      
      case 'number_1_5':
        const num = parseInt(answer);
        if (isNaN(num) || num < 1 || num > 5) {
          return { 
            valid: false, 
            message: 'Please provide a number between 1 and 5.' 
          };
        }
        break;
      
      default:
        return { valid: true, message: null };
    }

    return { valid: true, message: null };
  }

  /**
   * Get conversation summary for context
   */
  getConversationSummary(context) {
    const summary = [];
    
    Object.entries(context).forEach(([key, value]) => {
      if (key !== 'current_question' && value) {
        summary.push(`${key}: ${value}`);
      }
    });
    
    return summary.join('\n');
  }

  /**
   * Check if conversation should continue
   */
  shouldContinue(questionId) {
    const question = this.getQuestion(questionId);
    return question && question.next && question.next !== 'end';
  }

  /**
   * Get all questions for debugging
   */
  getAllQuestions() {
    return this.questions;
  }

  /**
   * Get question count
   */
  getQuestionCount() {
    return this.questions.length;
  }

  /**
   * Check if we should use dynamic questions based on conversation progress
   */
  shouldUseDynamicQuestions(conversationContext, currentQuestionId) {
    // Use dynamic questions after the first foundation question
    const foundationQuestions = ['q1'];
    
    // Check if we have answers to foundation questions
    const hasFoundation = foundationQuestions.some(q => 
      conversationContext.answers && conversationContext.answers[q]
    );
    
    // Check if we're past the foundation questions
    const isPastFoundation = !foundationQuestions.includes(currentQuestionId);
    
    // Use dynamic questions if we have foundation answers AND we're past foundation questions
    // OR if we're currently on q1 (the last foundation question)
    const shouldUseDynamic = hasFoundation && (isPastFoundation || currentQuestionId === 'q1');
    
    console.log(`🔍 Dynamic question check:`, {
      currentQuestionId,
      hasFoundation,
      isPastFoundation,
      shouldUseDynamic,
      answers: conversationContext.answers || {}
    });
    
    return shouldUseDynamic;
  }

  /**
   * Get a dynamic question prompt for the current context
   */
  getDynamicQuestionPrompt() {
    return "I'd love to hear more about your story. What would you like to share next?";
  }

  /**
   * Score question based on type
   */
  getQuestionTypeScore(question) {
    const typeScores = {
      'free_text': 10,
      'multiple_choice': 8,
      'yes_no': 6,
      'closing': 0
    };
    
    return typeScores[question.type] || 5;
  }

  /**
   * Score question based on context relevance
   */
  getContextRelevanceScore(question, context) {
    let score = 0;
    
    // If we have a name, questions that use it get higher scores
    if (context.name && question.prompt.includes('{{name}}')) {
      score += 5;
    }
    
    // Questions that build on previous answers get higher scores
    if (context.answers) {
      const hasRelevantContext = Object.keys(context.answers).some(key => 
        question.context_key && question.context_key !== key
      );
      if (hasRelevantContext) {
        score += 3;
      }
    }
    
    // Questions about family and memories get higher scores (core purpose)
    const familyKeywords = ['family', 'memory', 'story', 'childhood', 'grandparent', 'tradition'];
    const hasFamilyKeywords = familyKeywords.some(keyword => 
      question.prompt.toLowerCase().includes(keyword)
    );
    if (hasFamilyKeywords) {
      score += 4;
    }
    
    return score;
  }

  /**
   * Score question based on time efficiency
   */
  getTimeEfficiencyScore(question, timeRemaining) {
    // Shorter prompts are better when time is limited
    const promptLength = question.prompt.length;
    
    if (timeRemaining < 1) {
      // Very limited time - prefer very short questions
      return promptLength < 100 ? 10 : 0;
    } else if (timeRemaining < 2) {
      // Limited time - prefer shorter questions
      return promptLength < 150 ? 8 : 4;
    }
    
    return 0; // No time pressure
  }
}

module.exports = ConversationFlow;
