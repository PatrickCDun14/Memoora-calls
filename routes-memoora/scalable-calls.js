const express = require('express');
const router = express.Router();
const { validateApiKey } = require('../utils/security');
const VoiceModularityService = require('../utils/voice-modularity-service');
const SupabaseService = require('../utils/supabase-service');
const { rateLimit } = require('express-rate-limit');
const twilio = require('twilio');

const voiceService = new VoiceModularityService();
const supabaseService = new SupabaseService();

// Rate limiting per API key (100 calls per minute per user)
const callRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each API key to 100 calls per minute
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many calls from this API key, please try again later',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.apiKeyInfo?.key || req.ip
});

// Apply security middleware to all routes
router.use(validateApiKey);

// 🚀 Route 1: Configure and initiate a call (async)
router.post('/configure', callRateLimit, async (req, res) => {
  try {
    const { 
      phoneNumber, 
      question, 
      voiceConfig, 
      recordingSettings = {},
      scheduledFor = null // ISO string for future calls
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !question) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['phoneNumber', 'question']
      });
    }

    // Check account quotas
    const quotaCheck = await supabaseService.checkAccountQuotas(req.apiKeyInfo.accountId);
    if (!quotaCheck.canMakeCall) {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: quotaCheck.message,
        limits: quotaCheck.limits
      });
    }

    // Create call record immediately (async processing)
    const callData = {
      account_id: req.apiKeyInfo.accountId,
      api_key_id: req.apiKeyInfo.id,
      from_number: process.env.TWILIO_PHONE_NUMBER,
      to_number: phoneNumber,
      status: 'queued',
      metadata: {
        question,
        voiceConfig,
        recordingSettings,
        scheduledFor,
        requestedAt: new Date().toISOString()
      }
    };

    const call = await supabaseService.createCall(callData);

    // If scheduled for future, just save it
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      await supabaseService.scheduleCall(call.id, scheduledFor);
      
      return res.status(202).json({
        message: 'Call scheduled successfully',
        callId: call.id,
        status: 'scheduled',
        scheduledFor,
        estimatedStartTime: scheduledFor
      });
    }

    // For immediate calls, queue them for processing
    await supabaseService.queueCallForProcessing(call.id);

    // Return immediately - call will be processed asynchronously
    res.status(202).json({
      message: 'Call queued for processing',
      callId: call.id,
      status: 'queued',
      estimatedStartTime: 'within 30 seconds'
    });

    // Process call asynchronously (don't await)
    processCallAsync(call.id, req.apiKeyInfo.accountId, {
      phoneNumber,
      question,
      voiceConfig,
      recordingSettings
    }).catch(error => {
      console.error(`❌ Error processing call ${call.id}:`, error);
      supabaseService.updateCallStatus(call.id, 'failed', { error: error.message });
    });

  } catch (error) {
    console.error('❌ Error configuring call:', error);
    res.status(500).json({
      error: 'Failed to configure call',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🚀 Route 2: Get call status and progress
router.get('/:callId/status', async (req, res) => {
  try {
    const { callId } = req.params;
    
    // Verify call belongs to this API key's account
    const call = await supabaseService.getCall(callId, req.apiKeyInfo.accountId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    // Get detailed status including events
    const callEvents = await supabaseService.getCallEvents(callId);
    const recording = call.recording_filename ? await supabaseService.getRecording(call.recording_filename) : null;

    res.json({
      callId: call.id,
      status: call.status,
      progress: getCallProgress(call.status),
      phoneNumber: call.to_number,
      question: call.metadata?.question,
      duration: call.duration,
      recording: recording ? {
        filename: recording.filename,
        duration: recording.duration,
        size: recording.file_size,
        downloadUrl: `${process.env.BASE_URL}/api/v1/recordings/${recording.filename}`
      } : null,
      events: callEvents.map(event => ({
        type: event.event_type,
        timestamp: event.timestamp,
        data: event.event_data
      })),
      metadata: call.metadata,
      createdAt: call.created_at,
      updatedAt: call.updated_at
    });

  } catch (error) {
    console.error('❌ Error fetching call status:', error);
    res.status(500).json({
      error: 'Failed to fetch call status',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🚀 Route 3: Batch call operations
router.post('/batch', callRateLimit, async (req, res) => {
  try {
    const { calls, voiceConfig, recordingSettings = {} } = req.body;
    
    if (!Array.isArray(calls) || calls.length === 0) {
      return res.status(400).json({
        error: 'Invalid calls array',
        required: 'Array of calls with phoneNumber and question'
      });
    }

    if (calls.length > 50) {
      return res.status(400).json({
        error: 'Batch too large',
        message: 'Maximum 50 calls per batch'
      });
    }

    // Check batch quotas
    const quotaCheck = await supabaseService.checkBatchQuotas(req.apiKeyInfo.accountId, calls.length);
    if (!quotaCheck.canMakeBatch) {
      return res.status(429).json({
        error: 'Batch quota exceeded',
        message: quotaCheck.message,
        limits: quotaCheck.limits
      });
    }

    // Create all call records
    const batchResults = [];
    for (const callData of calls) {
      const call = await supabaseService.createCall({
        account_id: req.apiKeyInfo.accountId,
        api_key_id: req.apiKeyInfo.id,
        from_number: process.env.TWILIO_PHONE_NUMBER,
        to_number: callData.phoneNumber,
        status: 'queued',
        metadata: {
          question: callData.question,
          voiceConfig: callData.voiceConfig || voiceConfig,
          recordingSettings: callData.recordingSettings || recordingSettings,
          batchId: req.body.batchId || `batch_${Date.now()}`,
          requestedAt: new Date().toISOString()
        }
      });

      batchResults.push({
        callId: call.id,
        phoneNumber: callData.phoneNumber,
        status: 'queued'
      });

      // Queue for processing
      await supabaseService.queueCallForProcessing(call.id);
    }

    // Return batch results immediately
    res.status(202).json({
      message: 'Batch calls queued for processing',
      batchSize: calls.length,
      calls: batchResults,
      estimatedStartTime: 'within 1-2 minutes'
    });

    // Process calls asynchronously
    processBatchAsync(batchResults.map(r => r.callId), req.apiKeyInfo.accountId, {
      voiceConfig,
      recordingSettings
    }).catch(error => {
      console.error('❌ Error processing batch:', error);
    });

  } catch (error) {
    console.error('❌ Error processing batch calls:', error);
    res.status(500).json({
      error: 'Failed to process batch calls',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🚀 Route 4: Get batch status
router.get('/batch/:batchId/status', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batchCalls = await supabaseService.getBatchCalls(batchId, req.apiKeyInfo.accountId);
    
    const summary = {
      batchId,
      totalCalls: batchCalls.length,
      statusCounts: {},
      calls: batchCalls.map(call => ({
        callId: call.id,
        phoneNumber: call.to_number,
        status: call.status,
        question: call.metadata?.question,
        duration: call.duration,
        recording: call.recording_filename ? {
          filename: call.recording_filename,
          downloadUrl: `${process.env.BASE_URL}/api/v1/recordings/${call.recording_filename}`
        } : null
      }))
    };

    // Count statuses
    batchCalls.forEach(call => {
      summary.statusCounts[call.status] = (summary.statusCounts[call.status] || 0) + 1;
    });

    res.json(summary);

  } catch (error) {
    console.error('❌ Error fetching batch status:', error);
    res.status(500).json({
      error: 'Failed to fetch batch status',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🚀 Route 5: Cancel pending calls
router.post('/:callId/cancel', async (req, res) => {
  try {
    const { callId } = req.params;
    
    const call = await supabaseService.getCall(callId, req.apiKeyInfo.accountId);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (['completed', 'failed', 'cancelled'].includes(call.status)) {
      return res.status(400).json({
        error: 'Cannot cancel call',
        message: `Call is already ${call.status}`
      });
    }

    // Cancel in Twilio if it's already initiated
    if (call.twilio_call_sid && ['queued', 'ringing', 'in-progress'].includes(call.status)) {
      try {
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilioClient.calls(call.twilio_call_sid).update({ status: 'cancelled' });
      } catch (twilioError) {
        console.warn(`⚠️ Could not cancel Twilio call ${call.twilio_call_sid}:`, twilioError.message);
      }
    }

    // Update status
    await supabaseService.updateCallStatus(callId, 'cancelled', {
      cancelledAt: new Date().toISOString(),
      cancelledBy: 'user'
    });

    res.json({
      message: 'Call cancelled successfully',
      callId,
      status: 'cancelled'
    });

  } catch (error) {
    console.error('❌ Error cancelling call:', error);
    res.status(500).json({
      error: 'Failed to cancel call',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 🚀 Route 6: Get account call statistics
router.get('/stats/account', async (req, res) => {
  try {
    const stats = await supabaseService.getAccountCallStats(req.apiKeyInfo.accountId);
    
    res.json({
      accountId: req.apiKeyInfo.accountId,
      stats: {
        totalCalls: stats.totalCalls,
        answeredCalls: stats.answeredCalls,
        totalDuration: stats.totalDuration,
        totalCost: stats.totalCost,
        averageDuration: stats.totalDuration > 0 ? Math.round(stats.totalDuration / stats.totalCalls) : 0
      },
      quotas: stats.quotas,
      recentActivity: stats.recentActivity
    });

  } catch (error) {
    console.error('❌ Error fetching account stats:', error);
    res.status(500).json({
      error: 'Failed to fetch account statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to get call progress percentage
function getCallProgress(status) {
  const progressMap = {
    'queued': 10,
    'initiating': 20,
    'ringing': 40,
    'answered': 60,
    'recording': 80,
    'completed': 100,
    'failed': 0,
    'cancelled': 0
  };
  return progressMap[status] || 0;
}

// Async call processing function
async function processCallAsync(callId, accountId, callConfig) {
  try {
    console.log(`🚀 Processing call ${callId} for account ${accountId}`);
    
    // Update status to initiating
    await supabaseService.updateCallStatus(callId, 'initiating');
    
    // Get voice configuration if specified
    let voiceTwiML = null;
    if (callConfig.voiceConfig) {
      try {
        voiceTwiML = await voiceService.generateTwiMLForConfiguration(callConfig.voiceConfig, accountId);
      } catch (error) {
        console.warn(`⚠️ Could not load voice config ${callConfig.voiceConfig}, using default`);
      }
    }

    // Initiate Twilio call
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const callParams = {
      to: callConfig.phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: `${process.env.BASE_URL}/api/v1/voice?config=${callConfig.voiceConfig || 'default'}`,
      statusCallback: `${process.env.BASE_URL}/api/v1/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: true,
      recordingStatusCallback: `${process.env.BASE_URL}/api/v1/handle-recording`,
      recordingStatusCallbackMethod: 'POST'
    };

    const call = await twilioClient.calls.create(callParams);
    
    // Update call with Twilio SID
    await supabaseService.updateCallWithTwilioSid(callId, call.sid);
    await supabaseService.updateCallStatus(callId, 'initiated');
    
    console.log(`✅ Call ${callId} initiated successfully with Twilio SID: ${call.sid}`);
    
  } catch (error) {
    console.error(`❌ Failed to process call ${callId}:`, error);
    await supabaseService.updateCallStatus(callId, 'failed', { error: error.message });
  }
}

// Async batch processing function
async function processBatchAsync(callIds, accountId, batchConfig) {
  console.log(`🚀 Processing batch of ${callIds.length} calls for account ${accountId}`);
  
  // Process calls with staggered delays to avoid overwhelming Twilio
  for (let i = 0; i < callIds.length; i++) {
    const callId = callIds[i];
    
    // Add delay between calls (100ms) to prevent rate limiting
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Get call details and process
    try {
      const call = await supabaseService.getCall(callId, accountId);
      if (call && call.status === 'queued') {
        await processCallAsync(callId, accountId, {
          phoneNumber: call.to_number,
          question: call.metadata?.question,
          voiceConfig: call.metadata?.voiceConfig || batchConfig.voiceConfig,
          recordingSettings: call.metadata?.recordingSettings || batchConfig.recordingSettings
        });
      }
    } catch (error) {
      console.error(`❌ Error processing call ${callId} in batch:`, error);
    }
  }
  
  console.log(`✅ Batch processing completed for account ${accountId}`);
}

module.exports = router;
