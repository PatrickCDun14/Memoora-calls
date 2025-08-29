const twilio = require('twilio');

class SimpleTwilioService {
  constructor() {
    // Initialize Twilio client
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // Validate configuration
    this.isConfigured = !!(this.client && this.phoneNumber);
    
    if (this.isConfigured) {
      console.log('📞 Twilio Service initialized successfully');
      console.log(`📞 Twilio Phone Number: ${this.phoneNumber}`);
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
      hasPhoneNumber: !!this.phoneNumber
    };
  }

  // Make a real phone call
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

      // Create Twilio call parameters
      const callParams = {
        to: phoneNumber,
        from: this.phoneNumber,
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
        callParams.statusCallbackEvent = [...callParams.statusCallbackEvent, 'answered'];
      }

      console.log('📞 Twilio call parameters:', {
        to: phoneNumber,
        from: this.phoneNumber,
        webhookUrl: callParams.url,
        record: callParams.record,
        baseUrl: baseUrl
      });

      // Make the actual call
      const call = await this.client.calls.create(callParams);

      console.log(`📞 Twilio call initiated successfully!`);
      console.log(`📞 Twilio Call SID: ${call.sid}`);
      console.log(`📞 Call Status: ${call.status}`);

      return {
        success: true,
        twilioSid: call.sid,
        status: call.status,
        callId: callId,
        message: 'Real phone call initiated via Twilio'
      };

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
