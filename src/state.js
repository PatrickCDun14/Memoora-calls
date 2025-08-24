// src/state.js
const Redis = require('ioredis');

class ConversationState {
  constructor() {
    this.backend = process.env.STATE_BACKEND || 'memory';
    this.redis = null;
    this.memoryState = new Map();
    
    if (this.backend === 'redis') {
      this.initializeRedis();
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      
      this.redis.on('connect', () => {
        console.log('✅ Redis connected for conversation state');
      });
      
      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
        console.log('🔄 Falling back to memory state management');
        this.backend = 'memory';
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      console.log('🔄 Falling back to memory state management');
      this.backend = 'memory';
    }
  }

  /**
   * Get conversation state for a call
   */
  async getState(callSid) {
    try {
      if (this.backend === 'redis' && this.redis) {
        const stateData = await this.redis.get(`conv:${callSid}`);
        return stateData ? JSON.parse(stateData) : this.getDefaultState();
      } else {
        return this.memoryState.get(callSid) || this.getDefaultState();
      }
    } catch (error) {
      console.error('❌ Error getting state:', error);
      return this.getDefaultState();
    }
  }

  /**
   * Set conversation state for a call
   */
  async setState(callSid, state) {
    try {
      if (this.backend === 'redis' && this.redis) {
        // Set with expiration (24 hours)
        await this.redis.setex(`conv:${callSid}`, 86400, JSON.stringify(state));
      } else {
        this.memoryState.set(callSid, state);
      }
      return true;
    } catch (error) {
      console.error('❌ Error setting state:', error);
      return false;
    }
  }

  /**
   * Update conversation state
   */
  async updateState(callSid, updates) {
    try {
      const currentState = await this.getState(callSid);
      const newState = { ...currentState, ...updates };
      return await this.setState(callSid, newState);
    } catch (error) {
      console.error('❌ Error updating state:', error);
      return false;
    }
  }

  /**
   * Add answer to conversation context
   */
  async addAnswer(callSid, questionId, answer, transcript) {
    try {
      const currentState = await this.getState(callSid);
      
      const updatedState = {
        ...currentState,
        current_question: questionId,
        answers: {
          ...currentState.answers,
          [questionId]: {
            answer: answer,
            transcript: transcript,
            timestamp: new Date().toISOString()
          }
        },
        context: {
          ...currentState.context,
          [questionId]: answer
        },
        last_updated: new Date().toISOString()
      };
      
      return await this.setState(callSid, updatedState);
    } catch (error) {
      console.error('❌ Error adding answer:', error);
      return false;
    }
  }

  /**
   * Get conversation context for AI reasoning
   */
  async getConversationContext(callSid) {
    try {
      const state = await this.getState(callSid);
      return {
        current_question: state.current_question,
        answers: state.answers || {},
        context: state.context || {},
        conversation_start: state.conversation_start,
        last_updated: state.last_updated
      };
    } catch (error) {
      console.error('❌ Error getting conversation context:', error);
      return {};
    }
  }

  /**
   * Check if conversation exists
   */
  async hasConversation(callSid) {
    try {
      if (this.backend === 'redis' && this.redis) {
        return await this.redis.exists(`conv:${callSid}`);
      } else {
        return this.memoryState.has(callSid);
      }
    } catch (error) {
      console.error('❌ Error checking conversation:', error);
      return false;
    }
  }

  /**
   * Clean up old conversations
   */
  async cleanupOldConversations(maxAge = 86400000) { // 24 hours default
    try {
      const cutoff = new Date(Date.now() - maxAge);
      
      if (this.backend === 'redis' && this.redis) {
        // Redis handles expiration automatically
        return true;
      } else {
        // Clean up old memory state
        for (const [callSid, state] of this.memoryState.entries()) {
          if (state.last_updated && new Date(state.last_updated) < cutoff) {
            this.memoryState.delete(callSid);
          }
        }
        return true;
      }
    } catch (error) {
      console.error('❌ Error cleaning up conversations:', error);
      return false;
    }
  }

  /**
   * Get default state structure
   */
  getDefaultState() {
    return {
      conversation_start: new Date().toISOString(),
      current_question: 'q1',
      answers: {},
      context: {},
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Get conversation statistics
   */
  async getStats() {
    try {
      if (this.backend === 'redis' && this.redis) {
        const keys = await this.redis.keys('conv:*');
        return {
          total_conversations: keys.length,
          backend: 'redis'
        };
      } else {
        return {
          total_conversations: this.memoryState.size,
          backend: 'memory'
        };
      }
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return { total_conversations: 0, backend: 'unknown' };
    }
  }

  /**
   * Close connections
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

module.exports = ConversationState;
