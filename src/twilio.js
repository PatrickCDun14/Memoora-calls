// src/twilio.js
const twilio = require('twilio');
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
   * Check if recording is available
   */
  async checkRecordingAvailability(recordingUrl) {
    try {
      const recordingSidMatch = recordingUrl.match(/Recordings\/([^\/\?]+)/);
      if (!recordingSidMatch) {
        return false;
      }
      
      const recordingSid = recordingSidMatch[1];
      const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Recordings/${recordingSid}`;
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        auth: {
          username: this.accountSid,
          password: this.authToken
        },
        timeout: 10000
      });
      
      return response.status === 200;
    } catch (error) {
      console.log(`ℹ️ Recording availability check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Download recording from Twilio with retry logic
   */
  async downloadRecording(recordingUrl, callSid, retryCount = 0) {
    try {
      console.log(`⬇️ Downloading recording from: ${recordingUrl} (attempt ${retryCount + 1})`);
      
      // Extract recording SID from URL
      const recordingSidMatch = recordingUrl.match(/Recordings\/([^\/\?]+)/);
      if (!recordingSidMatch) {
        throw new Error('Invalid recording URL format');
      }
      
      const recordingSid = recordingSidMatch[1];
      console.log(`🎵 Recording SID: ${recordingSid}`);
      
      // Construct proper Twilio API URL
      const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Recordings/${recordingSid}.mp3`;
      console.log(`🔗 API URL: ${apiUrl}`);
      
      // Validate credentials
      this.validateCredentials();
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        auth: {
          username: this.accountSid,
          password: this.authToken
        },
        headers: {
          'Accept': 'audio/mpeg,audio/mp3,*/*',
          'User-Agent': 'Memoora-Calls/1.0'
        },
        timeout: 30000, // 30 second timeout
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Accept only 2xx status codes
        }
      });
      
      console.log(`✅ Recording download response: ${response.status} ${response.statusText}`);
      
      // Create recordings directory if it doesn't exist
      const recordingsDir = path.join(__dirname, '..', 'recordings', 'interactive');
      await fsPromises.mkdir(recordingsDir, { recursive: true });
      
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
      console.error(`❌ Error downloading recording (attempt ${retryCount + 1}):`, error);
      
      // Log more details for debugging
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response headers:', error.response.headers);
        console.error('❌ Response data:', error.response.data);
      }
      
      if (error.request) {
        console.error('❌ Request details:', {
          method: error.request.method,
          url: error.request.url,
          headers: error.request.getHeaders?.()
        });
      }
      
      // Retry logic for 404 errors (recording might not be ready yet)
      if (error.response?.status === 404 && retryCount < 2) {
        console.log(`🔄 Recording not ready yet, retrying in 2 seconds... (${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.downloadRecording(recordingUrl, callSid, retryCount + 1);
      }
      
      throw error;
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
}

module.exports = TwilioHelpers;
