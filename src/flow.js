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
}

module.exports = ConversationFlow;
