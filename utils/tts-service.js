// utils/tts-service.js
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class TTSService {
  constructor() {
    this.openai = null;
    this.provider = process.env.TTS_PROVIDER || 'openai';
    this.enabled = process.env.ENABLE_QUESTION_READING === 'true';
    
    // Voice customization from environment
    this.defaultPersonality = process.env.VOICE_PERSONALITY || 'warm-elder';
    this.defaultSpeed = parseFloat(process.env.VOICE_SPEED) || 0.85;
    this.defaultModel = process.env.VOICE_MODEL || 'tts-1-hd';
    
    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Generate audio from text using the configured TTS provider
   */
  async generateAudio(text, options = {}) {
    if (!this.enabled) {
      console.log('⚠️  TTS is disabled. Set ENABLE_QUESTION_READING=true');
      return null;
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required and must be a string');
    }

    if (text.length > 500) {
      throw new Error('Text too long (max 500 characters)');
    }

    // Sanitize text
    const sanitizedText = this.sanitizeText(text);

    try {
      switch (this.provider) {
        case 'openai':
          return await this.generateOpenAIAudio(sanitizedText, options);
        default:
          throw new Error(`TTS provider '${this.provider}' not implemented`);
      }
    } catch (error) {
      console.error('❌ TTS audio generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate audio using OpenAI TTS with enhanced natural speech
   */
  async generateOpenAIAudio(text, options = {}) {
    if (!this.openai) {
      throw new Error('OpenAI client not configured. Set OPENAI_API_KEY');
    }

    const {
      voice = 'nova', // nova is most natural for conversational speech
      model = 'tts-1-hd', // HD model for better quality
      speed = 0.9, // Slightly slower for natural pacing
      style = 'natural' // natural, warm, friendly
    } = options;

    console.log(`🎙️  Generating enhanced OpenAI TTS audio: "${text.substring(0, 50)}..."`);

    // Convert text to SSML for more natural speech
    const ssmlText = this.convertToSSML(text, style);

    const mp3 = await this.openai.audio.speech.create({
      model: model,
      voice: voice,
      input: ssmlText,
      speed: speed
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    console.log(`✅ Enhanced TTS audio generated: ${buffer.length} bytes`);
    return buffer;
  }

  /**
   * Convert plain text to SSML for natural speech patterns
   */
  convertToSSML(text, style = 'natural') {
    // Clean up the text first
    let cleanText = text
      .replace(/[?!]/g, '') // Remove punctuation that might interfere
      .trim();

    // Add natural pauses and emphasis based on content
    let ssml = '<speak>';
    
    // Add style-specific prosody
    switch (style) {
      case 'warm':
        ssml += '<prosody rate="0.9" pitch="+1st" volume="loud">';
        break;
      case 'friendly':
        ssml += '<prosody rate="0.95" pitch="+0.5st" volume="medium">';
        break;
      case 'natural':
      default:
        ssml += '<prosody rate="0.9" pitch="+0.2st" volume="medium">';
        break;
    }

    // Split into sentences for natural pacing
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach((sentence, index) => {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) return;

      // Add natural pauses between sentences
      if (index > 0) {
        ssml += '<break time="0.3s"/>';
      }

      // Add emphasis to key words (first few words of each sentence)
      const words = trimmedSentence.split(' ');
      if (words.length > 3) {
        // Emphasize the first few words for natural flow
        ssml += `<emphasis level="moderate">${words.slice(0, 2).join(' ')}</emphasis>`;
        ssml += ` ${words.slice(2).join(' ')}`;
      } else {
        ssml += trimmedSentence;
      }
    });

    ssml += '</prosody></speak>';
    
    console.log(`🎭 SSML generated for style "${style}": ${ssml.substring(0, 100)}...`);
    return ssml;
  }

  /**
   * Generate audio with specific voice personality
   */
  async generatePersonalityAudio(text, personality = null) {
    // Use default personality from environment if none specified
    const selectedPersonality = personality || this.defaultPersonality;
    
    const personalityConfigs = {
      'warm-elder': {
        voice: 'nova',
        model: this.defaultModel,
        speed: this.defaultSpeed,
        style: 'warm'
      },
      'friendly-guide': {
        voice: 'alloy',
        model: this.defaultModel,
        speed: this.defaultSpeed * 1.05, // Slightly faster
        style: 'friendly'
      },
      'storyteller': {
        voice: 'fable',
        model: this.defaultModel,
        speed: this.defaultSpeed * 0.95, // Slightly slower for storytelling
        style: 'natural'
      },
      'conversational': {
        voice: 'echo',
        model: this.defaultModel,
        speed: this.defaultSpeed * 1.1, // More conversational pace
        style: 'natural'
      }
    };

    const config = personalityConfigs[selectedPersonality] || personalityConfigs['warm-elder'];
    
    console.log(`🎭 Generating ${selectedPersonality} personality audio with ${config.voice} voice...`);
    return await this.generateOpenAIAudio(text, config);
  }

  /**
   * Save TTS audio to a temporary file
   */
  async saveTemporaryAudio(audioBuffer, callSid, question) {
    const tempDir = path.join(__dirname, '..', 'temp');
    
    // Ensure temp directory exists
    try {
      await fs.access(tempDir);
    } catch {
      await fs.mkdir(tempDir, { recursive: true });
    }

    const filename = `question_${callSid}_${Date.now()}.mp3`;
    const filepath = path.join(tempDir, filename);
    
    await fs.writeFile(filepath, audioBuffer);
    
    console.log(`💾 TTS audio saved: ${filepath}`);
    return { filename, filepath };
  }

  /**
   * Clean up temporary audio files
   */
  async cleanupTempAudio(filepath) {
    try {
      await fs.unlink(filepath);
      console.log(`🗑️  Temp audio cleaned up: ${filepath}`);
    } catch (error) {
      console.log('⚠️  Could not delete temp audio file:', error.message);
    }
  }

  /**
   * Sanitize text input
   */
  sanitizeText(text) {
    // Remove HTML/script tags
    let sanitized = text.replace(/<[^>]*>/g, '');
    
    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Limit length
    if (sanitized.length > 500) {
      sanitized = sanitized.substring(0, 497) + '...';
    }
    
    return sanitized;
  }

  /**
   * Check if TTS is available
   */
  isAvailable() {
    return this.enabled && this.openai !== null;
  }

  /**
   * Get available voices with enhanced descriptions
   */
  getAvailableVoices() {
    if (this.provider === 'openai') {
      return [
        { 
          id: 'nova', 
          name: 'Nova', 
          description: 'Warm, friendly, and conversational - perfect for family stories',
          personality: 'warm-elder'
        },
        { 
          id: 'alloy', 
          name: 'Alloy', 
          description: 'Balanced and versatile - great for general conversation',
          personality: 'friendly-guide'
        },
        { 
          id: 'echo', 
          name: 'Echo', 
          description: 'Clear and professional - excellent for clear communication',
          personality: 'conversational'
        },
        { 
          id: 'fable', 
          name: 'Fable', 
          description: 'Storytelling voice - perfect for narrative questions',
          personality: 'storyteller'
        },
        { 
          id: 'onyx', 
          name: 'Onyx', 
          description: 'Deep and authoritative - great for serious topics',
          personality: 'warm-elder'
        },
        { 
          id: 'shimmer', 
          name: 'Shimmer', 
          description: 'Bright and energetic - perfect for uplifting questions',
          personality: 'friendly-guide'
        }
      ];
    }
    return [];
  }

  /**
   * Get personality configurations
   */
  getPersonalityConfigs() {
    return {
      'warm-elder': {
        name: 'Warm Elder',
        description: 'Gentle, caring voice perfect for family stories',
        voice: 'nova',
        speed: 0.85,
        style: 'warm'
      },
      'friendly-guide': {
        name: 'Friendly Guide',
        description: 'Approachable and encouraging voice',
        voice: 'alloy',
        speed: 0.9,
        style: 'friendly'
      },
      'storyteller': {
        name: 'Storyteller',
        description: 'Narrative voice with natural pacing',
        voice: 'fable',
        speed: 0.8,
        style: 'natural'
      },
      'conversational': {
        name: 'Conversational',
        description: 'Natural, everyday conversation style',
        voice: 'echo',
        speed: 0.95,
        style: 'natural'
      }
    };
  }
}

module.exports = TTSService;
