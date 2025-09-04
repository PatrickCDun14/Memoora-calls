const express = require('express');
const router = express.Router();
const https = require('https');

// Helper function to make HTTP requests
const makeHttpRequest = (url, options, data) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: () => Promise.resolve(JSON.parse(responseData))
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
};

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
    
        // Create enhanced TwiML with greeting, delay, and better call handling
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- 2-second delay after pickup -->
  <Pause length="2"/>
  
  <!-- Greeting message -->
  <Say 
    voice="${selectedVoice.voice}" 
    language="${selectedVoice.language}"
    rate="${selectedVoice.rate}"
    pitch="${selectedVoice.pitch}"
  >Hey hows it going, memoora here.</Say>
  
  <!-- Brief pause between greeting and question -->
  <Pause length="1"/>
  
  <!-- Custom question/message -->
  <Say 
    voice="${selectedVoice.voice}" 
    language="${selectedVoice.language}"
    rate="${selectedVoice.rate}"
    pitch="${selectedVoice.pitch}"
  >${customMessage}</Say>
  
  <!-- Brief pause before recording starts -->
  <Pause length="1"/>

  <!-- Enhanced recording with post-call transcription -->
  <Record
    maxLength="300"
    timeout="15"
    playBeep="true"
    action="/api/v1/recording-complete"
    method="POST"
    trim="trim-silence"
    recordingStatusCallback="/api/v1/recording-status"
    recordingStatusCallbackMethod="POST"
    transcribe="true"
    transcribeCallback="/api/v1/transcription-complete"
    transcribeCallbackMethod="POST"
  />

  <!-- Handle recording completion or failure -->
  <Say 
    voice="${selectedVoice.voice}" 
    language="${selectedVoice.language}"
    rate="${selectedVoice.rate}"
    pitch="${selectedVoice.pitch}"
  >Thank you for sharing your story with us.</Say>
  
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

      // Analyze recording duration to determine outcome
      const recordingDuration = parseInt(RecordingDuration) || 0;
      let recordingOutcome = 'successful';
      let outcomeReason = 'recording_completed';
      
      if (recordingDuration === 0) {
        recordingOutcome = 'silent_recording';
        outcomeReason = 'no_audio_detected';
      } else if (recordingDuration < 3) {
        recordingOutcome = 'too_short';
        outcomeReason = 'recording_under_3_seconds';
      } else if (recordingDuration > 280) {
        recordingOutcome = 'max_length_reached';
        outcomeReason = 'recording_hit_max_length';
      }
      
      // Update call status to indicate recording received with outcome analysis
      callService.updateCallStatus(callRecord.id, 'recording_received', {
        metadata: {
          ...callRecord.metadata,
          recordingSid: RecordingSid,
          recordingUrl: RecordingUrl,
          recordingDuration: RecordingDuration,
          recordingOutcome: recordingOutcome,
          outcomeReason: outcomeReason,
          webhookReceivedAt: new Date().toISOString()
        }
      });
      
      console.log(`🎙️ Recording received for call ${callRecord.id}: ${recordingDuration}s (outcome: ${recordingOutcome})`);

      // Download and save recording with delay to ensure Twilio has processed it
      setTimeout(() => {
        console.log('🎵 Starting recording download for call:', callRecord.id);
        recordingService.downloadRecording(RecordingUrl, RecordingSid, callRecord.id)
          .then(async (recordingData) => {
            // Update call with recording info
            callService.addRecordingToCall(callRecord.id, recordingData);
            console.log('✅ Recording saved successfully for call', callRecord.id);
            
            // Send webhook to main backend if configured
            if (process.env.MAIN_BACKEND_URL) {
              try {
                const webhookData = {
                  CallSid: callRecord.twilioSid,
                  RecordingSid: recordingData.recordingSid,
                  RecordingUrl: recordingData.recordingUrl,
                  RecordingDuration: callRecord.metadata?.recordingDuration || '0',
                  filename: recordingData.filename,
                  fileSize: recordingData.size,
                  durationSeconds: parseInt(callRecord.metadata?.recordingDuration) || 0,
                  callId: callRecord.id,
                  phoneNumber: callRecord.phoneNumber,
                  customMessage: callRecord.customMessage,
                  callType: callRecord.callType,
                  storytellerId: callRecord.storytellerId,
                  familyMemberId: callRecord.familyMemberId,
                  scheduledCallId: callRecord.scheduledCallId,
                  apiKeyInfo: callRecord.apiKeyInfo
                };
                
                console.log('📤 Sending webhook to main backend:', process.env.MAIN_BACKEND_URL);
                
                const response = await makeHttpRequest(`${process.env.MAIN_BACKEND_URL}/api/calls/recording-complete`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                }, JSON.stringify(webhookData));
                
                if (response.ok) {
                  const responseData = await response.json();
                  console.log('✅ Webhook sent to main backend successfully:', responseData);
                } else {
                  console.error('❌ Failed to send webhook to main backend:', response.status, response.statusText);
                }
              } catch (error) {
                console.error('❌ Error sending webhook to main backend:', error.message);
              }
            } else {
              console.log('ℹ️  MAIN_BACKEND_URL not configured - skipping webhook');
            }
            
            // Get the recording outcome from metadata
            const recordingOutcome = callRecord.metadata?.recordingOutcome || 'successful';
            const outcomeReason = callRecord.metadata?.outcomeReason || 'recording_completed';
            
            // Check if transcription is available
            const hasTranscription = callRecord.metadata?.transcriptionText;
            const transcriptionStatus = callRecord.metadata?.transcriptionStatus;
            
            // Update call status to completed with final outcome
            callService.updateCallStatus(callRecord.id, 'completed', {
              metadata: {
                ...callRecord.metadata,
                recordingDownloaded: true,
                recordingDownloadedAt: new Date().toISOString(),
                finalOutcome: recordingOutcome,
                finalOutcomeReason: outcomeReason,
                transcriptionAvailable: !!hasTranscription,
                transcriptionStatus: transcriptionStatus || 'pending'
              }
            });
            
            console.log(`🎉 Call ${callRecord.id} completed with outcome: ${recordingOutcome} (${outcomeReason})`);
            if (hasTranscription) {
              console.log(`📝 Transcription available: ${transcriptionStatus}`);
            } else {
              console.log(`⏳ Transcription pending or not available`);
            }
          })
          .catch(error => {
            console.error('❌ Failed to save recording:', error.message);
            // Update call status to indicate recording failed
            callService.updateCallStatus(callRecord.id, 'recording_failed', {
              metadata: {
                ...callRecord.metadata,
                recordingError: error.message,
                recordingFailedAt: new Date().toISOString(),
                finalOutcome: 'download_failed',
                finalOutcomeReason: 'recording_download_error'
              }
            });
            
            console.log(`❌ Call ${callRecord.id} failed: recording download error - ${error.message}`);
          });
      }, 2000); // Wait 2 seconds for Twilio to process

      res.status(200).json({ message: 'Recording webhook received and processing started' });
    } catch (error) {
      console.error('❌ Error in recording webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // 📝 Transcription complete webhook (Twilio)
  router.post('/transcription-complete', (req, res) => {
    try {
      const { CallSid, RecordingSid, TranscriptionSid, TranscriptionText, TranscriptionStatus, TranscriptionUrl } = req.body;
      
      console.log('📝 Transcription complete webhook received:', {
        CallSid,
        RecordingSid,
        TranscriptionSid,
        TranscriptionStatus,
        TranscriptionText: TranscriptionText ? TranscriptionText.substring(0, 100) + '...' : 'No text'
      });
      
      if (!CallSid || !TranscriptionSid) {
        console.warn('⚠️  Missing required transcription data:', req.body);
        return res.status(400).json({ error: 'Missing required transcription data' });
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
        return res.status(200).json({ message: 'Call not found, but transcription webhook received' });
      }

      // Update call with transcription info
      callService.updateCallStatus(callRecord.id, callRecord.status, {
        metadata: {
          ...callRecord.metadata,
          transcriptionSid: TranscriptionSid,
          transcriptionStatus: TranscriptionStatus,
          transcriptionText: TranscriptionText,
          transcriptionUrl: TranscriptionUrl,
          transcriptionReceivedAt: new Date().toISOString()
        }
      });

      console.log(`📝 Transcription received for call ${callRecord.id}: ${TranscriptionStatus}`);

      // Send transcription to main backend if configured
      if (process.env.MAIN_BACKEND_URL && TranscriptionText) {
        try {
          const webhookData = {
            CallSid: callRecord.twilioSid,
            RecordingSid: callRecord.metadata?.recordingSid,
            TranscriptionSid: TranscriptionSid,
            TranscriptionText: TranscriptionText,
            TranscriptionStatus: TranscriptionStatus,
            TranscriptionUrl: TranscriptionUrl,
            callId: callRecord.id,
            phoneNumber: callRecord.phoneNumber,
            customMessage: callRecord.customMessage,
            callType: callRecord.callType,
            storytellerId: callRecord.storytellerId,
            familyMemberId: callRecord.familyMemberId,
            scheduledCallId: callRecord.scheduledCallId,
            apiKeyInfo: callRecord.apiKeyInfo
          };
          
          console.log('📤 Sending transcription webhook to main backend:', process.env.MAIN_BACKEND_URL);
          
          makeHttpRequest(`${process.env.MAIN_BACKEND_URL}/api/calls/transcription-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }, JSON.stringify(webhookData))
          .then(async response => {
            if (response.ok) {
              const responseData = await response.json();
              console.log('✅ Transcription webhook sent to main backend successfully:', responseData);
            } else {
              console.error('❌ Failed to send transcription webhook to main backend:', response.status, response.statusText);
            }
          })
          .catch(error => {
            console.error('❌ Error sending transcription webhook to main backend:', error.message);
          });
        } catch (error) {
          console.error('❌ Error preparing transcription webhook:', error.message);
        }
      } else {
        console.log('ℹ️  MAIN_BACKEND_URL not configured or no transcription text - skipping webhook');
      }

      res.status(200).json({ message: 'Transcription webhook received and processing started' });
    } catch (error) {
      console.error('❌ Error in transcription webhook:', error);
      res.status(500).json({ error: 'Transcription webhook processing failed' });
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
      const { CallSid, CallStatus, CallDuration, CallDurationMinutes, CallDurationSeconds } = req.body;
      
      console.log('📊 Call status webhook received:', {
        CallSid,
        CallStatus,
        CallDuration,
        CallDurationMinutes,
        CallDurationSeconds
      });
      
      if (CallSid && CallStatus) {
        // Find and update call status
        for (const [id, call] of callService.calls) {
          if (call.twilioSid === CallSid) {
            // Enhanced status mapping for better call outcome tracking
            let mappedStatus = CallStatus;
            let outcome = 'unknown';
            
            switch (CallStatus) {
              case 'completed':
                outcome = 'successful_recording';
                break;
              case 'busy':
                outcome = 'line_busy';
                break;
              case 'no-answer':
                outcome = 'no_answer';
                break;
              case 'failed':
                outcome = 'call_failed';
                break;
              case 'canceled':
                outcome = 'call_canceled';
                break;
              case 'answered':
                outcome = 'call_answered';
                break;
              case 'in-progress':
                outcome = 'call_in_progress';
                break;
              case 'ringing':
                outcome = 'call_ringing';
                break;
              default:
                outcome = CallStatus;
            }
            
            // Update call with enhanced metadata
            callService.updateCallStatus(id, mappedStatus, { 
              duration: CallDuration,
              durationMinutes: CallDurationMinutes,
              durationSeconds: CallDurationSeconds,
              outcome: outcome,
              statusUpdatedAt: new Date().toISOString(),
              metadata: {
                ...call.metadata,
                lastStatus: CallStatus,
                lastStatusAt: new Date().toISOString(),
                callOutcome: outcome
              }
            });
            
            console.log(`✅ Call ${id} status updated to ${mappedStatus} (outcome: ${outcome})`);
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
