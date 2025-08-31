const express = require('express');
const router = express.Router();

module.exports = function(apiKeyService, callService, twilioService, recordingService) {

  // 🔑 API Key validation middleware
  const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    try {
      const validation = apiKeyService.validateApiKey(apiKey);
      if (!validation.valid) {
        return res.status(401).json({ error: validation.message });
      }
      req.apiKey = apiKey;
      req.account = validation.keyRecord;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid API key' });
    }
  };

  // 📍 Discovery endpoint
  router.get('/', (req, res) => {
    res.json({
      service: 'Memoora Call Recording Microservice',
      version: '1.0.0',
      description: 'A microservice for initiating phone calls and recording stories',
      endpoints: {
        'GET /': 'This discovery endpoint',
        'GET /health': 'Service health check',
        'POST /generate-api-key': 'Generate new API key (public)',
        'POST /call': 'Initiate outbound phone call',
        'GET /calls': 'List all calls',
        'GET /calls/:callId': 'Get call details',
        'GET /recordings': 'List all recordings',
        'GET /recordings/:filename': 'Get recording details',
        'GET /api-keys': 'List API keys (admin only)',
        'GET /stats': 'Service statistics'
      },
      authentication: {
        method: 'API Key',
        header: 'x-api-key'
      }
    });
  });

  // 🔑 Generate API key (public endpoint)
  router.post('/generate-api-key', (req, res) => {
    try {
      const { clientName, email, companyWebsite, phoneNumber } = req.body;
      
      if (!clientName || !email || !companyWebsite || !phoneNumber) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['clientName', 'email', 'companyWebsite', 'phoneNumber']
        });
      }

      const apiKey = apiKeyService.createApiKey({
        clientName,
        email,
        companyWebsite,
        phoneNumber
      });

      res.status(201).json(apiKey);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 📞 Initiate call
  router.post('/call', validateApiKey, (req, res) => {
    try {
      const { phoneNumber, customMessage, storytellerId, familyMemberId, scheduledCallId, callType, interactive } = req.body;
      
      if (!phoneNumber || !customMessage) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['phoneNumber', 'customMessage']
        });
      }

      // Create call record
      const callRecord = callService.createCall({
        phoneNumber,
        customMessage,
        storytellerId,
        familyMemberId,
        scheduledCallId,
        callType: callType || 'storytelling',
        interactive: interactive !== false,
        apiKeyInfo: req.account
      });

      // If Twilio is configured, make real call
      if (twilioService.isReady()) {
        twilioService.makeCall({
          phoneNumber,
          customMessage,
          callId: callRecord.id,
          webhookUrl: `${process.env.BASE_URL || 'http://localhost:5005'}/api/v1/voice`
        })
        .then(twilioResult => {
          // Update call record with Twilio SID and caller ID information
          callService.updateCallStatus(callRecord.id, 'twilio_initiated', {
            twilioSid: twilioResult.twilioSid,
            metadata: {
              twilioStatus: twilioResult.status,
              callerId: twilioResult.callerId,
              callerIdType: twilioResult.callerIdType,
              fallbackUsed: twilioResult.fallbackUsed || false,
              fallbackReason: twilioResult.fallbackReason || null
            }
          });
          
          console.log(`📞 Call ${callRecord.id} initiated with caller ID: ${twilioResult.callerId} (${twilioResult.callerIdType})`);
          if (twilioResult.fallbackUsed) {
            console.log(`⚠️  Fallback used for call ${callRecord.id}: ${twilioResult.fallbackReason}`);
          }
        })
        .catch(twilioError => {
          callService.updateCallStatus(callRecord.id, 'twilio_failed', {
            metadata: {
              twilioError: twilioError.message
            }
          });
        });
      }

      res.status(200).json({
        success: true,
        message: 'Call initiated successfully',
        callId: callRecord.id,
        phoneNumber: callRecord.phoneNumber,
        status: callRecord.status
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 📋 List calls
  router.get('/calls', validateApiKey, (req, res) => {
    try {
      const calls = callService.getCallsByApiKey(req.account.id);
      res.json({ calls });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 📞 Get call details
  router.get('/calls/:callId', validateApiKey, (req, res) => {
    try {
      const call = callService.getCall(req.params.callId);
      if (!call) {
        return res.status(404).json({ error: 'Call not found' });
      }
      res.json({ call });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 🎵 List recordings
  router.get('/recordings', validateApiKey, (req, res) => {
    try {
      const recordings = recordingService.listRecordings();
      res.json({ recordings });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 🎵 Get recording details
  router.get('/recordings/:filename', validateApiKey, (req, res) => {
    try {
      const recording = recordingService.getRecording(req.params.filename);
      if (!recording) {
        return res.status(404).json({ error: 'Recording not found' });
      }
      res.json({ recording });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 🔑 List API keys (admin only)
  router.get('/api-keys', validateApiKey, (req, res) => {
    try {
      const apiKeys = apiKeyService.getAllApiKeys();
      res.json({ apiKeys });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 📊 Service statistics
  router.get('/stats', validateApiKey, (req, res) => {
    try {
      const stats = {
        apiKeys: apiKeyService.getStats(),
        calls: callService.getCallStats(),
        recordings: recordingService.getRecordingsStats()
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 🔊 Voice webhook (Twilio)
  router.post('/voice', (req, res) => {
    // Get call information from Twilio
    const { CallSid, From, To } = req.body;
    
    console.log('🎤 Voice webhook called with:', {
      CallSid,
      From,
      To,
      body: req.body
    });

    // Find the call record by phone number (To field from Twilio - the recipient's number)
    let callRecord = null;
    let customMessage = 'Please share your story with us.';
    
    if (To) {
      // Remove the '+' prefix if present for comparison
      const phoneNumber = To.startsWith('+') ? To : `+${To}`;
      
      console.log('🔍 Looking for call record with phone number:', phoneNumber);
      
      // Search through all calls to find one with this phone number
      for (const [id, call] of callService.calls) {
        console.log('🔍 Checking call:', call.id, 'phone:', call.phoneNumber, 'status:', call.status);
        if (call.phoneNumber === phoneNumber && (call.status === 'in-progress' || call.status === 'twilio_initiated' || call.status === 'ringing' || call.status === 'initiated')) {
          callRecord = call;
          customMessage = call.customMessage;
          console.log('✅ Found call record:', call.id, 'with message:', customMessage);
          break;
        }
      }
      
      if (!callRecord) {
        console.warn('⚠️  No active call found for phone number:', phoneNumber);
        console.warn('⚠️  Available calls:', Array.from(callService.calls.values()).map(c => ({ id: c.id, phone: c.phoneNumber, status: c.status })));
        console.warn('⚠️  Looking for phone number:', phoneNumber);
        console.warn('⚠️  Call statuses we accept:', ['in-progress', 'twilio_initiated', 'ringing', 'initiated']);
      }
    }

    // Voice configuration for more natural speech
    const voiceConfig = {
      // Neural voices (most human-like)
      neural: {
        voice: 'Google.en-US-Neural2-F',  // Female neural voice
        language: 'en-US',
        rate: '0.9',      // Slightly slower for clarity
        pitch: '+0.1'     // Slightly higher pitch for warmth
      },
      // Alternative: Polly voices (also very natural)
      polly: {
        voice: 'Polly.Joanna-Neural',     // Female Polly voice
        language: 'en-US',
        rate: '0.95',     // Natural speed
        pitch: '0'        // Natural pitch
      },
      // Traditional voices (fallback)
      traditional: {
        voice: 'alice',   // Standard Twilio voice
        language: 'en-US',
        rate: '1.0',      // Normal speed
        pitch: '0'        // Normal pitch
      }
    };

    // Select voice style (you can change this to 'polly' or 'traditional')
    const selectedVoice = voiceConfig.neural;
    
        // Create simplified TwiML with selected voice configuration
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Custom message with selected voice for natural sound -->
  <Say 
    voice="${selectedVoice.voice}" 
    language="${selectedVoice.language}"
    rate="${selectedVoice.rate}"
    pitch="${selectedVoice.pitch}"
  >${customMessage}</Say>
  <Pause length="1"/>

  <!-- Start recording immediately -->
  <Record
    maxLength="300"
    timeout="10"
    playBeep="true"
    action="/api/v1/recording-complete"
    method="POST"
    trim="trim-silence"
  />

  <!-- Simple hangup -->
  <Hangup/>
</Response>`;

    console.log('🎭 Using voice configuration:', selectedVoice);
    
    console.log('🎤 Voice webhook returning TwiML with message:', customMessage);
    res.type('text/xml');
    res.send(twiml);
  });

  // 🎙️ Recording complete webhook (Twilio)
  router.post('/recording-complete', (req, res) => {
    try {
      const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;
      
      console.log('🎙️ Recording complete webhook received:', {
        CallSid,
        RecordingSid,
        RecordingUrl,
        RecordingDuration
      });
      
      if (!CallSid || !RecordingSid || !RecordingUrl) {
        console.warn('⚠️  Missing required recording data:', req.body);
        return res.status(400).json({ error: 'Missing required recording data' });
      }

      // Find call by Twilio SID
      let callRecord = null;
      for (const [id, call] of callService.calls) {
        if (call.twilioSid === CallSid) {
          callRecord = call;
          break;
        }
      }

      if (!callRecord) {
        console.warn('⚠️  No call record found for Twilio SID:', CallSid);
        return res.status(200).json({ message: 'Call not found, but webhook received' });
      }

      // Update call status to indicate recording received
      callService.updateCallStatus(callRecord.id, 'recording_received', {
        metadata: {
          ...callRecord.metadata,
          recordingSid: RecordingSid,
          recordingUrl: RecordingUrl,
          recordingDuration: RecordingDuration,
          webhookReceivedAt: new Date().toISOString()
        }
      });

      // Download and save recording with delay to ensure Twilio has processed it
      setTimeout(() => {
        console.log('🎵 Starting recording download for call:', callRecord.id);
        recordingService.downloadRecording(RecordingUrl, RecordingSid, callRecord.id)
          .then(recordingData => {
            // Update call with recording info
            callService.addRecordingToCall(callRecord.id, recordingData);
            console.log('✅ Recording saved successfully for call', callRecord.id);
            
            // Update call status to completed
            callService.updateCallStatus(callRecord.id, 'completed', {
              metadata: {
                ...callRecord.metadata,
                recordingDownloaded: true,
                recordingDownloadedAt: new Date().toISOString()
              }
            });
          })
          .catch(error => {
            console.error('❌ Failed to save recording:', error.message);
            // Update call status to indicate recording failed
            callService.updateCallStatus(callRecord.id, 'recording_failed', {
              metadata: {
                ...callRecord.metadata,
                recordingError: error.message,
                recordingFailedAt: new Date().toISOString()
              }
            });
          });
      }, 2000); // Wait 2 seconds for Twilio to process

      res.status(200).json({ message: 'Recording webhook received and processing started' });
    } catch (error) {
      console.error('❌ Error in recording webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // 📊 Recording status webhook (Twilio)
  router.post('/recording-status', (req, res) => {
    try {
      const { CallSid, RecordingSid, RecordingStatus, RecordingUrl, RecordingDuration } = req.body;
      
      console.log('🎵 Recording status webhook received:', {
        CallSid,
        RecordingSid,
        RecordingStatus,
        RecordingDuration
      });

      if (CallSid && RecordingSid) {
        // Find and update call with recording status
        for (const [id, call] of callService.calls) {
          if (call.twilioSid === CallSid) {
            // Update call metadata with recording status
            callService.updateCallStatus(id, call.status, {
              metadata: {
                ...call.metadata,
                recordingStatus: RecordingStatus,
                recordingSid: RecordingSid,
                recordingDuration: RecordingDuration
              }
            });
            console.log('✅ Recording status updated for call', id);
            break;
          }
        }
      }

      res.status(200).json({ message: 'Recording status webhook received' });
    } catch (error) {
      console.error('❌ Error in recording status webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // 📊 Call status webhook (Twilio)
  router.post('/call-status', (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;
      
      if (CallSid && CallStatus) {
        // Find and update call status
        for (const [id, call] of callService.calls) {
          if (call.twilioSid === CallSid) {
            callService.updateCallStatus(id, CallStatus, { duration: CallDuration });
            break;
          }
        }
      }

      res.status(200).json({ message: 'Status webhook received' });
    } catch (error) {
      console.error('❌ Error in status webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
};
