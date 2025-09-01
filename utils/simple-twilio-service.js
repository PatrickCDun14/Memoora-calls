const twilio = require('twilio');

class SimpleTwilioService {
  constructor() {
    // Initialize Twilio client
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // Alpha sender ID configuration
    this.useAlphaSender = process.env.USE_ALPHA_SENDER_ID === 'true';
    this.alphaSenderId = process.env.ALPHA_SENDER_ID || 'Memoora';
    this.fallbackNumber = process.env.FALLBACK_PHONE_NUMBER || this.phoneNumber;
    
    // Validate configuration
    this.isConfigured = !!(this.client && this.phoneNumber);
    
    if (this.isConfigured) {
      console.log('📞 Twilio Service initialized successfully');
      console.log(`📞 Twilio Phone Number: ${this.phoneNumber}`);
      console.log(`📞 Alpha Sender ID: ${this.useAlphaSender ? this.alphaSenderId : 'disabled'}`);
      if (this.useAlphaSender) {
        console.log(`📞 Fallback Number: ${this.fallbackNumber}`);
      }
    } else {
      console.log('⚠️  Twilio Service not fully configured');
      console.log('⚠️  Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
    }
  }

  // Check if Twilio is properly configured
  isReady() {
    return this.isConfigured;
  }

  // Production-ready configuration validation
  validateConfiguration() {
    const errors = [];
    
    if (!this.accountSid) errors.push('TWILIO_ACCOUNT_SID is required');
    if (!this.authToken) errors.push('TWILIO_AUTH_TOKEN is required');
    if (!this.phoneNumber) errors.push('TWILIO_PHONE_NUMBER is required');
    
    if (this.phoneNumber && !this.phoneNumber.match(/^\+1\d{10}$/)) {
      errors.push('TWILIO_PHONE_NUMBER must be in +1XXXXXXXXXX format');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      hasCredentials: !!(this.accountSid && this.authToken),
      hasPhoneNumber: !!this.phoneNumber,
      alphaSenderEnabled: this.useAlphaSender,
      alphaSenderId: this.alphaSenderId
    };
  }

  // Make a real phone call with alpha sender ID support and fallback
  async makeCall(callData) {
    if (!this.isReady()) {
      throw new Error('Twilio service not configured');
    }

    const {
      phoneNumber,
      customMessage,
      callId,
      webhookUrl
    } = callData;

    try {
      console.log(`📞 Initiating real Twilio call to ${phoneNumber}`);
      console.log(`📞 Call ID: ${callId}`);
      console.log(`📞 Message: ${customMessage}`);

      // Get the base URL from environment or use ngrok URL
      const baseUrl = process.env.BASE_URL || 'http://localhost:5005';
      console.log(`📞 Using base URL: ${baseUrl}`);

      // Create base Twilio call parameters
      const baseCallParams = {
        to: phoneNumber,
        url: webhookUrl || `${baseUrl}/api/v1/voice`,
        statusCallback: `${baseUrl}/api/v1/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: true,
        recordingStatusCallback: `${baseUrl}/api/v1/recording-status`,
        recordingStatusCallbackMethod: 'POST'
      };

      // Add metadata to track the call
      if (callId) {
        baseCallParams.statusCallbackEvent = [...baseCallParams.statusCallbackEvent, 'answered'];
      }

      // Try alpha sender ID first if enabled
      if (this.useAlphaSender) {
        try {
          console.log(`📞 Attempting call with alpha sender ID: ${this.alphaSenderId}`);
          
          // For alpha sender ID, we need to use a special approach
          // First, try using the alpha sender ID directly (may work in some cases)
          const alphaCallParams = {
            ...baseCallParams,
            from: this.alphaSenderId
          };

          console.log('📞 Alpha sender call parameters:', {
            to: phoneNumber,
            from: this.alphaSenderId,
            webhookUrl: alphaCallParams.url,
            record: alphaCallParams.record,
            baseUrl: baseUrl
          });

          const call = await this.client.calls.create(alphaCallParams);

          console.log(`✅ Call initiated successfully with alpha sender ID: ${this.alphaSenderId}`);
          console.log(`📞 Twilio Call SID: ${call.sid}`);
          console.log(`📞 Call Status: ${call.status}`);

          return {
            success: true,
            twilioSid: call.sid,
            status: call.status,
            callId: callId,
            callerId: this.alphaSenderId,
            callerIdType: 'alpha_sender',
            message: 'Real phone call initiated via Twilio with alpha sender ID'
          };

        } catch (error) {
          console.error(`❌ Alpha sender ID failed: ${error.message}`);
          
          // Check if it's an alpha sender ID specific error
          if (error.code === 21211 || error.message.includes('Invalid') || error.message.includes('from') || error.message.includes('not a valid phone number')) {
            console.log(`🔄 Falling back to phone number: ${this.fallbackNumber}`);
            console.log(`ℹ️  Note: Alpha sender ID may require special Twilio account setup`);
            
            // Fallback to phone number with caller ID name configuration
            const fallbackCallParams = {
              ...baseCallParams,
              from: this.fallbackNumber
            };

            console.log('📞 Fallback call parameters:', {
              to: phoneNumber,
              from: this.fallbackNumber,
              webhookUrl: fallbackCallParams.url,
              record: fallbackCallParams.record,
              baseUrl: baseUrl
            });

            const fallbackCall = await this.client.calls.create(fallbackCallParams);

            console.log(`✅ Call initiated successfully with fallback phone number`);
            console.log(`📞 Twilio Call SID: ${fallbackCall.sid}`);
            console.log(`📞 Call Status: ${fallbackCall.status}`);
            console.log(`ℹ️  Caller ID will show phone number. For alpha sender ID, contact Twilio support.`);

            return {
              success: true,
              twilioSid: fallbackCall.sid,
              status: fallbackCall.status,
              callId: callId,
              callerId: this.fallbackNumber,
              callerIdType: 'phone_number',
              fallbackUsed: true,
              fallbackReason: error.message,
              message: 'Real phone call initiated via Twilio with fallback phone number'
            };
          }
          
          // If it's not an alpha sender ID issue, re-throw the error
          throw error;
        }
      } else {
        // Alpha sender ID disabled, use phone number directly
        console.log(`📞 Using phone number caller ID: ${this.phoneNumber}`);
        
        const phoneCallParams = {
          ...baseCallParams,
          from: this.phoneNumber
        };

        console.log('📞 Phone number call parameters:', {
          to: phoneNumber,
          from: this.phoneNumber,
          webhookUrl: phoneCallParams.url,
          record: phoneCallParams.record,
          baseUrl: baseUrl
        });

        const call = await this.client.calls.create(phoneCallParams);

        console.log(`✅ Call initiated successfully with phone number`);
        console.log(`📞 Twilio Call SID: ${call.sid}`);
        console.log(`📞 Call Status: ${call.status}`);

        return {
          success: true,
          twilioSid: call.sid,
          status: call.status,
          callId: callId,
          callerId: this.phoneNumber,
          callerIdType: 'phone_number',
          message: 'Real phone call initiated via Twilio with phone number'
        };
      }

    } catch (error) {
      console.error('❌ Twilio call failed:', error.message);
      throw new Error(`Twilio call failed: ${error.message}`);
    }
  }

  // Get call status from Twilio
  async getCallStatus(twilioSid) {
    if (!this.isReady()) {
      throw new Error('Twilio service not configured');
    }

    try {
      const call = await this.client.calls(twilioSid).fetch();
      
      return {
        sid: call.sid,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        price: call.price,
        priceUnit: call.priceUnit
      };
    } catch (error) {
      console.error('❌ Failed to get Twilio call status:', error.message);
      throw new Error(`Failed to get call status: ${error.message}`);
    }
  }

  // Cancel/end an active call
  async endCall(twilioSid) {
    if (!this.isReady()) {
      throw new Error('Twilio service not configured');
    }

    try {
      const call = await this.client.calls(twilioSid).update({ status: 'completed' });
      
      console.log(`📞 Call ${twilioSid} ended successfully`);
      
      return {
        success: true,
        sid: call.sid,
        status: call.status,
        message: 'Call ended successfully'
      };
    } catch (error) {
      console.error('❌ Failed to end call:', error.message);
      throw new Error(`Failed to end call: ${error.message}`);
    }
  }

  // Get call recordings
  async getCallRecordings(twilioSid) {
    if (!this.isReady()) {
      throw new Error('Twilio service not configured');
    }

    try {
      const recordings = await this.client.recordings.list({
        callSid: twilioSid
      });

      return recordings.map(recording => ({
        sid: recording.sid,
        duration: recording.duration,
        startTime: recording.startTime,
        endTime: recording.endTime,
        price: recording.price,
        priceUnit: recording.priceUnit,
        uri: recording.uri,
        mediaUrl: recording.mediaUrl
      }));
    } catch (error) {
      console.error('❌ Failed to get call recordings:', error.message);
      throw new Error(`Failed to get recordings: ${error.message}`);
    }
  }

  // Download recording audio
  async downloadRecording(recordingSid, outputPath) {
    if (!this.isReady()) {
      throw new Error('Twilio service not configured');
    }

    try {
      const recording = await this.client.recordings(recordingSid).fetch();
      
      // For now, return the recording info
      // In production, you'd implement actual file download
      return {
        sid: recording.sid,
        duration: recording.duration,
        mediaUrl: recording.mediaUrl,
        uri: recording.uri,
        outputPath: outputPath
      };
    } catch (error) {
      console.error('❌ Failed to download recording:', error.message);
      throw new Error(`Failed to download recording: ${error.message}`);
    }
  }

  // Get account information
  async getAccountInfo() {
    if (!this.isReady()) {
      throw new Error('Twilio service not configured');
    }

    try {
      const account = await this.client.api.accounts(this.client.accountSid).fetch();
      
      return {
        sid: account.sid,
        name: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
        dateUpdated: account.dateUpdated
      };
    } catch (error) {
      console.error('❌ Failed to get account info:', error.message);
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  // Get usage statistics
  async getUsageStats() {
    if (!this.isReady()) {
      throw new Error('Twilio service not configured');
    }

    try {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const usage = await this.client.usage.records.list({
        startDate: firstDay.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      });

      return usage.map(record => ({
        category: record.category,
        count: record.count,
        countUnit: record.countUnit,
        price: record.price,
        priceUnit: record.priceUnit,
        usage: record.usage,
        usageUnit: record.usageUnit
      }));
    } catch (error) {
      console.error('❌ Failed to get usage stats:', error.message);
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }
  }

  // Test Twilio connection
  async testConnection() {
    if (!this.isReady()) {
      return { success: false, message: 'Twilio not configured' };
    }

    try {
      const account = await this.getAccountInfo();
      return { 
        success: true, 
        message: 'Twilio connection successful',
        account: account
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Twilio connection failed: ${error.message}` 
      };
    }
  }
}

module.exports = SimpleTwilioService;
