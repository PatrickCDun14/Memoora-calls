// src/twilio.js
const twilio = require('twilio');
const { VoiceResponse } = twilio;
const axios = require('axios');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

class TwilioHelpers {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
  }

  /**
   * Generate TwiML for starting a conversation
   */
  generateConversationStart(question, baseUrl) {
    const twiml = new VoiceResponse();
    
    // Welcome message
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, question.prompt);
    
    // Start recording the answer
    twiml.record({
      action: `${baseUrl}/api/v1/interactive/handle-recording`,
      method: 'POST',
      maxLength: 60, // 60 seconds max for cost optimization
      finishOnKey: '#',
      playBeep: false,
      trim: 'trim-silence'
    });
    
    // If they don't say anything, give them another chance
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'I didn\'t hear anything. Please try again.');
    
    twiml.record({
      action: `${baseUrl}/api/v1/interactive/handle-recording`,
      method: 'POST',
      maxLength: 60,
      finishOnKey: '#',
      playBeep: false,
      trim: 'trim-silence'
    });
    
    return twiml.toString();
  }

  /**
   * Generate TwiML for continuing conversation
   */
  generateConversationContinue(question, baseUrl) {
    const twiml = new VoiceResponse();
    
    // Ask the next question
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, question.prompt);
    
    // Record the answer
    twiml.record({
      action: `${baseUrl}/api/v1/interactive/handle-recording`,
      method: 'POST',
      maxLength: 60,
      finishOnKey: '#',
      playBeep: false,
      trim: 'trim-silence'
    });
    
    return twiml.toString();
  }

  /**
   * Generate TwiML for conversation end
   */
  generateConversationEnd(closingMessage) {
    const twiml = new VoiceResponse();
    
    // Say closing message
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, closingMessage);
    
    // Hang up
    twiml.hangup();
    
    return twiml.toString();
  }

  /**
   * Generate TwiML for error/retry
   */
  generateRetryMessage(message, baseUrl) {
    const twiml = new VoiceResponse();
    
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, message);
    
    // Give them another chance to answer
    twiml.record({
      action: `${baseUrl}/api/v1/interactive/handle-recording`,
      method: 'POST',
      maxLength: 60,
      finishOnKey: '#',
      playBeep: false,
      trim: 'trim-silence'
    });
    
    return twiml.toString();
  }

  /**
   * Download recording from Twilio
   */
  async downloadRecording(recordingUrl, callSid) {
    try {
      console.log(`⬇️ Downloading recording from: ${recordingUrl}`);
      
      // Add .mp3 extension if not present
      const downloadUrl = recordingUrl.endsWith('.mp3') ? recordingUrl : `${recordingUrl}.mp3`;
      
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        auth: {
          username: this.accountSid,
          password: this.authToken
        },
        timeout: 30000 // 30 second timeout
      });
      
      // Create recordings directory if it doesn't exist
      const recordingsDir = path.join(__dirname, '..', 'recordings', 'interactive');
      await fs.mkdir(recordingsDir, { recursive: true });
      
      // Generate filename
      const timestamp = Date.now();
      const filename = `interactive_${callSid}_${timestamp}.mp3`;
      const filepath = path.join(recordingsDir, filename);
      
      // Save the recording
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Recording saved: ${filepath}`);
          resolve({ filename, filepath });
        });
        
        writer.on('error', (error) => {
          console.error('❌ Error saving recording:', error);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('❌ Error downloading recording:', error);
      throw error;
    }
  }

  /**
   * Get recording metadata
   */
  async getRecordingMetadata(recordingUrl) {
    try {
      const response = await axios({
        method: 'GET',
        url: recordingUrl,
        auth: {
          username: this.accountSid,
          password: this.authToken
        }
      });
      
      return {
        duration: response.data.duration,
        size: response.data.size,
        channels: response.data.channels,
        sampleRate: response.data.sample_rate
      };
      
    } catch (error) {
      console.error('❌ Error getting recording metadata:', error);
      return null;
    }
  }

  /**
   * Validate Twilio credentials
   */
  validateCredentials() {
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }
    return true;
  }

  /**
   * Generate TwiML for testing
   */
  generateTestTwiML() {
    const twiml = new VoiceResponse();
    
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Hello! This is a test of the interactive phone bot. The system is working correctly.');
    
    twiml.hangup();
    
    return twiml.toString();
  }
}

module.exports = TwilioHelpers;
