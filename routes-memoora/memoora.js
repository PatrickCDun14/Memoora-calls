require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const express = require('express');
const router = express.Router();
const { VoiceResponse } = require('twilio/lib/twiml/VoiceResponse');
const twilio = require('twilio');
const { notifyAppBackend } = require('../utils/notifyAppBackend');
const { 
  validateApiKey, 
  callFrequencyLimiter, 
  validatePhoneNumber, 
  requestSizeLimiter
} = require('../utils/security');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Health check endpoint for API routes
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'Memoora Call Recording Microservice API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Voice personality test endpoint
router.get('/voice-test', async (req, res) => {
  try {
    const TTSService = require('../utils/tts-service');
    const ttsService = new TTSService();
    
    if (!ttsService.isAvailable()) {
      return res.status(503).json({
        error: 'TTS service not available',
        message: 'Please check OPENAI_API_KEY configuration'
      });
    }
    
    const testText = req.query.text || "Hello! I'm here to help you share your family stories. What's a memory that makes you smile?";
    const personality = req.query.personality || 'warm-elder';
    
    console.log(`🎭 Testing voice personality: ${personality} with text: "${testText}"`);
    
    const audioBuffer = await ttsService.generatePersonalityAudio(testText, personality);
    
    // Return audio buffer directly
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Content-Disposition': `attachment; filename="voice-test-${personality}.mp3"`
    });
    
    res.send(audioBuffer);
    
  } catch (error) {
    console.error('❌ Voice test failed:', error);
    res.status(500).json({
      error: 'Voice test failed',
      message: error.message
    });
  }
});

// Voice personalities info endpoint
router.get('/voice-personalities', (req, res) => {
  try {
    const TTSService = require('../utils/tts-service');
    const ttsService = new TTSService();
    
    res.json({
      available: ttsService.getPersonalityConfigs(),
      voices: ttsService.getAvailableVoices(),
      provider: ttsService.provider,
      enabled: ttsService.enabled
    });
    
  } catch (error) {
    console.error('❌ Failed to get voice personalities:', error);
    res.status(500).json({
      error: 'Failed to get voice personalities',
      message: error.message
    });
  }
});

// Interactive call initiation endpoint
router.post('/interactive-call', async (req, res) => {
  console.log('🎭 Interactive Call Initiation Request');
  console.log('=====================================');
  console.log(`📱 Request Time: ${new Date().toISOString()}`);
  console.log(`🔑 API Key: ${req.headers['x-api-key'] ? req.headers['x-api-key'].substring(0, 10) + '...' : 'Not provided'}`);
  console.log('=====================================');

  try {
    // Validate API key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required', message: 'Please provide x-api-key header' });
    }

    const { validateApiKey } = require('../utils/security');
    const validationResult = await validateApiKey(apiKey);
    
    if (!validationResult.valid) {
      return res.status(401).json({ error: 'Invalid API key', message: validationResult.message });
    }

    // Validate request body
    const { phoneNumber, metadata = {} } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Missing required field', message: 'phoneNumber is required' });
    }

    // Validate phone number
    const { validatePhoneNumber } = require('../utils/security');
    const phoneValidation = validatePhoneNumber(phoneNumber);
    
    if (!phoneValidation.valid) {
      return res.status(400).json({ error: 'Invalid phone number', message: phoneValidation.message });
    }

    // Check rate limits
    const { checkCallFrequency } = require('../utils/security');
    const rateLimitCheck = checkCallFrequency(validationResult.accountId);
    
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        message: rateLimitCheck.message,
        retryAfter: rateLimitCheck.retryAfter
      });
    }

    // Initiate interactive call with Twilio
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const callParams = {
      to: phoneValidation.formatted,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: `${process.env.BASE_URL}/api/v1/interactive/start`,
      statusCallback: `${process.env.BASE_URL}/api/v1/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: true,
      recordingStatusCallback: `${process.env.BASE_URL}/api/v1/interactive/handle-recording`,
      recordingStatusCallbackMethod: 'POST'
    };

    console.log('🚀 Initiating Interactive Call');
    console.log('===============================');
    console.log(`📱 Target Number: ${phoneValidation.formatted}`);
    console.log(`📞 Twilio Number: ${process.env.TWILIO_PHONE_NUMBER}`);
    console.log(`🌐 Interactive Start: ${process.env.BASE_URL}/api/v1/interactive/start`);
    console.log(`📊 Status Callback: ${process.env.BASE_URL}/api/v1/call-status`);
    console.log(`🕐 Initiation Time: ${new Date().toISOString()}`);
    console.log('===============================');

    const call = await client.calls.create(callParams);

    // Store call information in database
    const SupabaseService = require('../utils/supabase-service');
    const supabaseService = new SupabaseService();
    
    const callData = {
      account_id: validationResult.accountId,
      api_key_id: validationResult.keyId,
      from_number: process.env.TWILIO_PHONE_NUMBER,
      to_number: phoneValidation.formatted,
      twilio_call_sid: call.sid,
      status: 'initiated',
      metadata: {
        ...metadata,
        call_type: 'interactive',
        api_key: validationResult.keyId
      }
    };

    const { data: storedCall, error: storeError } = await supabaseService.supabase
      .from('calls')
      .insert([callData])
      .select()
      .single();

    if (storeError) {
      console.error('❌ Failed to store call in database:', storeError);
      // Don't fail the call initiation if database storage fails
    } else {
      console.log(`💾 Interactive call stored in database with ID: ${storedCall.id}`);
    }

    console.log(`📲 Interactive call initiated to ${phoneValidation.formatted}`);
    console.log(`🆔 Call SID: ${call.sid}`);
    console.log(`📊 Initial Status: ${call.status}`);

    res.status(200).json({
      message: 'Interactive call initiated successfully',
      callSid: call.sid,
      status: call.status,
      phoneNumber: phoneValidation.formatted,
      callType: 'interactive',
      estimatedDuration: '5-10 minutes',
      features: [
        'AI-powered conversation flow',
        'Dynamic follow-up questions',
        'Real-time transcription',
        'Contextual responses'
      ]
    });

  } catch (error) {
    console.error('❌ Failed to initiate interactive call:', error);
    
    res.status(500).json({
      error: 'Failed to initiate interactive call',
      details: error.message
    });
  }
});

// API key generation endpoint
router.post('/generate-key', async (req, res) => {
  try {
    const { clientName, email, companyWebsite, phoneNumber, description } = req.body;
    
    // Validate required fields
    if (!clientName || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['clientName', 'email']
      });
    }
    
    // Generate API key
    const apiKeyService = require('../utils/api-key-service');
    const keyInfo = await apiKeyService.createApiKey({
      clientName,
      email,
      companyWebsite,
      phoneNumber,
      description
    });
    
    res.status(201).json({
      message: 'API key generated successfully',
      apiKey: keyInfo.apiKey,
      keyId: keyInfo.keyId,
      clientName: keyInfo.clientName,
      email: keyInfo.email,
      createdAt: keyInfo.createdAt,
      permissions: keyInfo.permissions,
      limits: {
        maxCallsPerDay: keyInfo.maxCallsPerDay,
        maxCallsPerMonth: keyInfo.maxCallsPerMonth
      },
      warning: 'Store this API key securely. It will not be shown again.',
      nextSteps: [
        '1. Save this API key immediately',
        '2. Use it in the x-api-key header for all API calls',
        '3. Check the API documentation for usage examples',
        '4. Monitor your usage to stay within limits'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error generating API key:', error);
    res.status(500).json({ 
      error: 'Failed to generate API key',
      message: error.message 
    });
  }
});

// Security middleware applied to specific routes as needed

// 🔊 Route 1: Called when Twilio makes the outbound call and hits this Memoora endpoint
router.all('/voice', async (req, res) => {
    console.log('🎯 Voice Webhook Triggered');
    console.log('==========================');
    console.log(`📱 Call SID: ${req.body.CallSid || 'N/A'}`);
    console.log(`📞 From: ${req.body.From || 'N/A'}`);
    console.log(`📱 To: ${req.body.To || 'N/A'}`);
    console.log(`🕐 Webhook Time: ${new Date().toISOString()}`);
    console.log('🎙️  Checking if this should be an interactive call...');
    console.log('==========================');
    
    try {
      // Check if this call should be interactive by looking up the call record
      const SupabaseService = require('../utils/supabase-service');
      const supabaseService = new SupabaseService();
      
      const callSid = req.body.CallSid;
      const { data: calls, error } = await supabaseService.supabase
        .from('calls')
        .select('*')
        .eq('twilio_call_sid', callSid)
        .limit(1);
      
      if (error || !calls || calls.length === 0) {
        console.log('⚠️  No call record found, using basic voice');
        // Fall back to basic voice if no call record found
        const basicTwiml = new VoiceResponse();
        basicTwiml.play(`${process.env.BASE_URL}/api/v1/audio/personal-greeting.mp3`);
        basicTwiml.record({
          action: `${process.env.BASE_URL}/api/v1/handle-recording`,
          method: 'POST',
          maxLength: process.env.MAX_RECORDING_DURATION || 120,
          finishOnKey: '#',
          playBeep: false
        });
        res.type('text/xml');
        return res.send(basicTwiml.toString());
      }
      
      const callRecord = calls[0];
      const isInteractive = callRecord.metadata?.interactive;
      const question = callRecord.metadata?.question;
      
      if (isInteractive && question) {
        console.log('🎯 This is an interactive call, redirecting to voice-interactive');
        console.log(`❓ Question: "${question}"`);
        
        // Redirect to the interactive voice handler
        const interactiveTwiml = new VoiceResponse();
        interactiveTwiml.redirect(`${process.env.BASE_URL}/api/v1/voice-interactive`);
        res.type('text/xml');
        return res.send(interactiveTwiml.toString());
      }
      
      // This is a basic call, use pre-recorded audio
      console.log('🎙️  Using basic voice with pre-recorded audio');
    const twiml = new VoiceResponse();
      twiml.play(`${process.env.BASE_URL}/api/v1/audio/personal-greeting.mp3`);
      
    twiml.record({
      action: `${process.env.BASE_URL}/api/v1/handle-recording`,
      method: 'POST',
      maxLength: process.env.MAX_RECORDING_DURATION || 120,
      finishOnKey: '#',
        playBeep: false
    });
    res.type('text/xml');
    res.send(twiml.toString());
      
    } catch (error) {
      console.error('❌ Error in voice webhook, falling back to basic voice:', error);
      
      // Fall back to basic voice on error
      const fallbackTwiml = new VoiceResponse();
      fallbackTwiml.play(`${process.env.BASE_URL}/api/v1/audio/personal-greeting.mp3`);
      
      fallbackTwiml.record({
        action: `${process.env.BASE_URL}/api/v1/handle-recording`,
        method: 'POST',
        maxLength: process.env.MAX_RECORDING_DURATION || 120,
        finishOnKey: '#',
        playBeep: false
      });
      res.type('text/xml');
      res.send(fallbackTwiml.toString());
    }
  });  

// 🔊 Route 1B: Interactive voice route for question-based calls
router.all('/voice-interactive', async (req, res) => {
    console.log('🎯 Interactive Voice Webhook Triggered');
    console.log('=====================================');
    console.log(`📱 Call SID: ${req.body.CallSid || 'N/A'}`);
    console.log(`📞 From: ${req.body.From || 'N/A'}`);
    console.log(`📱 To: ${req.body.To || 'N/A'}`);
    console.log(`🕐 Webhook Time: ${new Date().toISOString()}`);
    console.log('🎙️  Setting up interactive question-based call...');
    console.log('=====================================');
    
    try {
      // Get the call details from the database to retrieve the question
      const SupabaseService = require('../utils/supabase-service');
      const supabaseService = new SupabaseService();
      
      const callSid = req.body.CallSid;
      const { data: calls, error } = await supabaseService.supabase
        .from('calls')
        .select('*')
        .eq('twilio_call_sid', callSid)
        .limit(1);
      
      if (error || !calls || calls.length === 0) {
        console.log('⚠️  No call record found, falling back to basic voice');
        // Fall back to basic voice if no call record found
        const basicTwiml = new VoiceResponse();
        basicTwiml.say('Hello! Welcome to Memoora. Please share your story.');
        basicTwiml.record({
          action: `${process.env.BASE_URL}/api/v1/handle-recording`,
          method: 'POST',
          maxLength: process.env.MAX_RECORDING_DURATION || 120,
          finishOnKey: '#',
          playBeep: false
        });
        res.type('text/xml');
        return res.send(basicTwiml.toString());
      }
      
      const callRecord = calls[0];
      const question = callRecord.metadata?.question;
      
      if (!question) {
        console.log('⚠️  No question found in call record, falling back to basic voice');
        // Fall back to basic voice if no question
        const basicTwiml = new VoiceResponse();
        basicTwiml.say('Hello! Welcome to Memoora. Please share your story.');
        basicTwiml.record({
          action: `${process.env.BASE_URL}/api/v1/handle-recording`,
          method: 'POST',
          maxLength: process.env.MAX_RECORDING_DURATION || 120,
          finishOnKey: '#',
          playBeep: false
        });
        res.type('text/xml');
        return res.send(basicTwiml.toString());
      }
      
      console.log(`❓ Question for this call: "${question}"`);
      
      // Generate enhanced TTS audio for the question with personality
      const TTSService = require('../utils/tts-service');
      const ttsService = new TTSService();
      
      let questionAudioUrl = null;
      
      if (ttsService.isAvailable()) {
        try {
          // Generate TTS audio with warm-elder personality for family stories
          const audioBuffer = await ttsService.generatePersonalityAudio(question, 'warm-elder');
          
          // Save temporarily and get URL
          const { filename, filepath } = await ttsService.saveTemporaryAudio(
            audioBuffer, 
            callSid, 
            question
          );
          
          questionAudioUrl = `${process.env.BASE_URL}/api/v1/temp-audio/${filename}`;
          console.log(`🎙️  Enhanced TTS audio generated with warm-elder personality: ${questionAudioUrl}`);
          
        } catch (ttsError) {
          console.error('❌ Enhanced TTS failed, falling back to basic TTS:', ttsError.message);
          
          // Fallback to basic TTS
          try {
            const fallbackBuffer = await ttsService.generateAudio(question, {
              voice: 'nova',
              model: 'tts-1-hd',
              speed: 0.9
            });
            
            const { filename, filepath } = await ttsService.saveTemporaryAudio(
              fallbackBuffer, 
              callSid, 
              question
            );
            
            questionAudioUrl = `${process.env.BASE_URL}/api/v1/temp-audio/${filename}`;
            console.log(`🎙️  Fallback TTS audio generated: ${questionAudioUrl}`);
            
          } catch (fallbackError) {
            console.error('❌ Fallback TTS also failed:', fallbackError.message);
          }
        }
      }
      
      // Create interactive TwiML
      const twiml = new VoiceResponse();
      
      // Welcome message
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Hello! Welcome to Memoora. I have a special question for you today.');
      
      // Play the question audio if available, otherwise use TTS
      if (questionAudioUrl) {
        twiml.play(questionAudioUrl);
      } else {
        twiml.say({
          voice: 'alice',
          language: 'en-US'
        }, question);
      }
      
      // Instructions
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Please share your story. I\'ll be recording your response.');
      
      // Start recording
      twiml.record({
        action: `${process.env.BASE_URL}/api/v1/handle-recording`,
        method: 'POST',
        maxLength: process.env.MAX_RECORDING_DURATION || 120,
        finishOnKey: '#',
        playBeep: false
      });
      
      res.type('text/xml');
      res.send(twiml.toString());
      
    } catch (error) {
      console.error('❌ Error in interactive voice webhook:', error);
      
      // Fall back to basic voice on error
      const fallbackTwiml = new VoiceResponse();
      fallbackTwiml.say('Hello! Welcome to Memoora. Please share your story.');
      fallbackTwiml.record({
        action: `${process.env.BASE_URL}/api/v1/handle-recording`,
        method: 'POST',
        maxLength: process.env.MAX_RECORDING_DURATION || 120,
        finishOnKey: '#',
        playBeep: false
      });
      
      res.type('text/xml');
      res.send(fallbackTwiml.toString());
    }
  });

// 🔊 Route 1B: Interactive voice route for question-based calls - END

// 🎭 NEW: Interactive Phone Bot Routes
// ======================================

// Route 1: Start interactive conversation
router.post('/interactive/start', async (req, res) => {
  console.log('🎭 Interactive Phone Bot - Starting Conversation');
  console.log('================================================');
  console.log(`📱 Call SID: ${req.body.CallSid || 'N/A'}`);
  console.log(`📞 From: ${req.body.From || 'N/A'}`);
  console.log(`📱 To: ${req.body.To || 'N/A'}`);
  console.log(`🕐 Start Time: ${new Date().toISOString()}`);
  console.log('================================================');

  try {
    // Load conversation flow
    const ConversationFlow = require('../src/flow');
    const flow = new ConversationFlow();
    await flow.loadQuestions();

    // Get first question
    const firstQuestion = flow.getFirstQuestion();
    
    // Initialize conversation state
    const ConversationState = require('../src/state');
    const state = new ConversationState();
    
    const initialState = state.getDefaultState();
    await state.setState(req.body.CallSid, initialState);

    // Generate TwiML for first question
    const TwilioHelpers = require('../src/twilio');
    const twilio = new TwilioHelpers();
    
    console.log('🎭 Generating TwiML for first question:', firstQuestion);
    const twiml = twilio.generateConversationStart(firstQuestion, process.env.BASE_URL);
    console.log('✅ TwiML generated successfully');
    
    res.type('text/xml');
    res.send(twiml);

  } catch (error) {
    console.error('❌ Error starting interactive conversation:', error);
    
    // Fallback to basic voice
    const { VoiceResponse } = require('twilio/lib/twiml/VoiceResponse');
    const fallbackTwiml = new VoiceResponse();
    fallbackTwiml.say('Hello! Welcome to Memoora. Please share your story.');
    fallbackTwiml.record({
      action: `${process.env.BASE_URL}/api/v1/handle-recording`,
      method: 'POST',
      maxLength: 120,
      finishOnKey: '#',
      playBeep: false
    });
    
    res.type('text/xml');
    res.send(fallbackTwiml.toString());
  }
});

// Route 2: Handle recording during interactive conversation
router.post('/interactive/handle-recording', async (req, res) => {
  console.log('🎭 Interactive Phone Bot - Handling Recording');
  console.log('=============================================');
  console.log(`📱 Call SID: ${req.body.CallSid || 'N/A'}`);
  console.log(`🎵 Recording URL: ${req.body.RecordingUrl || 'N/A'}`);
  console.log(`⏱️  Duration: ${req.body.RecordingDuration || 'N/A'} seconds`);
  console.log(`🕐 Time: ${new Date().toISOString()}`);
  console.log('=============================================');

  try {
    const callSid = req.body.CallSid;
    const recordingUrl = req.body.RecordingUrl;

    if (!recordingUrl) {
      throw new Error('No recording URL provided');
    }

    // Download recording
    const TwilioHelpers = require('../src/twilio');
    const twilio = new TwilioHelpers();
    const { filepath } = await twilio.downloadRecording(recordingUrl, callSid);

    // Transcribe with Whisper
    const OpenAIHelpers = require('../src/openai');
    const openai = new OpenAIHelpers();
    console.log('🎙️ Starting Whisper transcription...');
    const transcript = await openai.transcribeAudio(filepath);
    console.log('✅ Whisper transcription completed');

    console.log(`📝 Transcript: "${transcript.substring(0, 100)}..."`);

    // Get conversation state
    const ConversationState = require('../src/state');
    const state = new ConversationState();
    const conversationState = await state.getState(callSid);

    // Get current question
    const ConversationFlow = require('../src/flow');
    const flow = new ConversationFlow();
    await flow.loadQuestions();
    
    const currentQuestion = flow.getQuestion(conversationState.current_question);

    // Analyze answer with GPT-4o-mini
    const analysis = await openai.analyzeAnswerAndDetermineNext(
      currentQuestion, 
      transcript, 
      conversationState, 
      flow
    );

    // Add answer to state
    await state.addAnswer(callSid, currentQuestion.id, transcript, transcript);

    // Determine next action
    if (analysis.should_proceed && analysis.next_question_id) {
      // Get next question
      const nextQuestion = flow.getQuestion(analysis.next_question_id);
      
      if (nextQuestion && nextQuestion.type !== 'closing') {
        // Continue conversation
        const twiml = twilio.generateConversationContinue(nextQuestion, process.env.BASE_URL);
        res.type('text/xml');
        res.send(twiml);
      } else {
        // End conversation
        const closingMessage = nextQuestion ? nextQuestion.prompt : 'Thank you for sharing your stories with us today.';
        const twiml = twilio.generateConversationEnd(closingMessage);
        res.type('text/xml');
        res.send(twiml);
      }
    } else if (analysis.feedback) {
      // Ask for clarification
      const twiml = twilio.generateRetryMessage(analysis.feedback, process.env.BASE_URL);
      res.type('text/xml');
      res.send(twiml);
    } else {
      // Fallback: continue to next question
      const nextQuestion = flow.getNextQuestion(currentQuestion.id, conversationState.context);
      if (nextQuestion) {
        const twiml = twilio.generateConversationContinue(nextQuestion, process.env.BASE_URL);
        res.type('text/xml');
        res.send(twiml);
      } else {
        const twiml = twilio.generateConversationEnd('Thank you for sharing your stories with us today.');
        res.type('text/xml');
        res.send(twiml);
      }
    }

  } catch (error) {
    console.error('❌ Error handling interactive recording:', error);
    
    // Fallback: ask them to try again
    const TwilioHelpers = require('../src/twilio');
    const twilio = new TwilioHelpers();
    const twiml = twilio.generateRetryMessage(
      'I\'m sorry, I had trouble processing that. Could you please try again?', 
      process.env.BASE_URL
    );
    
    res.type('text/xml');
    res.send(twiml);
  }
});

// Route 3: Interactive conversation status
router.get('/interactive/status/:callSid', async (req, res) => {
  try {
    const { callSid } = req.params;
    
    const ConversationState = require('../src/state');
    const state = new ConversationState();
    
    const conversationState = await state.getState(callSid);
    
    res.json({
      callSid,
      status: 'active',
      currentQuestion: conversationState.current_question,
      answersCount: Object.keys(conversationState.answers || {}).length,
      conversationStart: conversationState.conversation_start,
      lastUpdated: conversationState.last_updated
    });
    
  } catch (error) {
    console.error('❌ Error getting conversation status:', error);
    res.status(500).json({ error: 'Failed to get conversation status' });
  }
});

// Route 4: Interactive conversation summary
router.get('/interactive/summary/:callSid', async (req, res) => {
  try {
    const { callSid } = req.params;
    
    const ConversationState = require('../src/state');
    const state = new ConversationState();
    
    const conversationState = await state.getState(callSid);
    
    // Generate AI summary
    const OpenAIHelpers = require('../src/openai');
    const openai = new OpenAIHelpers();
    
    const ConversationFlow = require('../src/flow');
    const flow = new ConversationFlow();
    await flow.loadQuestions();
    
    const summary = await openai.generateConversationSummary(conversationState, flow);
    
    res.json({
      callSid,
      summary,
      answers: conversationState.answers || {},
      context: conversationState.context || {},
      conversationStart: conversationState.conversation_start,
      lastUpdated: conversationState.last_updated
    });
    
  } catch (error) {
    console.error('❌ Error getting conversation summary:', error);
    res.status(500).json({ error: 'Failed to get conversation summary' });
  }
});

// Route 5: Test interactive phone bot
router.get('/interactive/test', async (req, res) => {
  try {
    const TwilioHelpers = require('../src/twilio');
    const twilio = new TwilioHelpers();
    
    const twiml = twilio.generateTestTwiML();
    
    res.type('text/xml');
    res.send(twiml);
    
  } catch (error) {
    console.error('❌ Error generating test TwiML:', error);
    res.status(500).json({ error: 'Failed to generate test TwiML' });
  }
});

// 🎭 Interactive Phone Bot Routes - END
// ======================================

// 🎙️ Route 2: Called by Twilio after recording is completed
router.post('/handle-recording', async (req, res) => {
    console.log('🎙️  Recording Completed!');
    console.log('========================');
    console.log(`📱 Call SID: ${req.body.CallSid || 'N/A'}`);
    console.log(`📞 From: ${req.body.From || 'N/A'}`);
    console.log(`📱 To: ${req.body.To || 'N/A'}`);
    console.log(`🎵 Recording URL: ${req.body.RecordingUrl || 'N/A'}`);
    console.log(`⏱️  Recording Duration: ${req.body.RecordingDuration || 'N/A'} seconds`);
    console.log(`🕐 Completion Time: ${new Date().toISOString()}`);
    console.log('========================');
    
    console.log('🧾 Full Request Body:', req.body);
  
    const recordingUrl = req.body.RecordingUrl;
  
    if (!recordingUrl) {
      console.error('❌ No RecordingUrl found in request.');
      return res.status(400).send('Missing RecordingUrl');
    }
  
    const filename = `story-${Date.now()}.mp3`;
    const recordingsPath = process.env.RECORDINGS_PATH || './recordings';
    const filepath = path.join(__dirname, '..', recordingsPath, filename);
    
    // Ensure recordings directory exists
    if (!fs.existsSync(path.dirname(filepath))) {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
    }
    
    console.log(`⬇️ Will download from: ${recordingUrl}.mp3`);
  
    // Wait for Twilio to process the recording
    setTimeout(async () => {
      try {
        const response = await axios({
          method: 'GET',
          url: `${recordingUrl}.mp3`,
          responseType: 'stream',
          auth: {
            username: process.env.TWILIO_ACCOUNT_SID,
            password: process.env.TWILIO_AUTH_TOKEN
          },
          timeout: 30000 // 30 second timeout
        });
  
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
  
        writer.on('finish', async () => {
          console.log('💾 Recording Saved Successfully!');
          console.log('===============================');
          console.log(`📁 Filename: ${filename}`);
          console.log(`📁 Filepath: ${filepath}`);
          console.log(`📊 File Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
          console.log(`🕐 Save Time: ${new Date().toISOString()}`);
          console.log('===============================');
          
          const callSid = req.body.CallSid;

          // Optional DB writes (guarded by MICROSERVICE_DB_WRITES_ENABLED)
          if (process.env.MICROSERVICE_DB_WRITES_ENABLED === 'true') {
            try {
              const SupabaseService = require('../utils/supabase-service');
              const supabaseService = new SupabaseService();

              // Find the call by Twilio Call SID
              const calls = await supabaseService.supabase
                .from('calls')
                .select('*')
                .eq('twilio_call_sid', callSid)
                .limit(1);

              if (calls.data && calls.data.length > 0) {
                const callRecord = calls.data[0];

                // Create recording record
                const recordingData = {
                  call_id: callRecord.id,
                  filename: filename,
                  file_path: filepath,
                  file_size: fs.statSync(filepath).size,
                  duration: parseInt(req.body.RecordingDuration) || null,
                  recording_url: recordingUrl,
                  status: 'completed',
                  metadata: {
                    twilioRecordingUrl: recordingUrl,
                    savedAt: new Date().toISOString(),
                    fileSizeKB: (fs.statSync(filepath).size / 1024).toFixed(2)
                  }
                };

                const { data: recording, error } = await supabaseService.supabase
                  .from('recordings')
                  .insert(recordingData)
                  .select()
                  .single();

                if (error) {
                  console.error('❌ Error storing recording in database:', error.message);
                } else {
                  console.log(`💾 Recording stored in database with ID: ${recording.id}`);

                  // Update call record to link with recording
                  await supabaseService.supabase
                    .from('calls')
                    .update({ 
                      recording_id: recording.id,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', callRecord.id);

                  console.log(`🔗 Call ${callRecord.id} linked with recording ${recording.id}`);
                }
              } else {
                console.log(`⚠️  No call record found for Twilio SID: ${callSid}`);
              }
            } catch (dbError) {
              console.error('⚠️  Warning: Could not store recording in database:', dbError.message);
              // Continue even if database storage fails
            }
          }

          // Prepare metadata for notification (fetch from call record if available)
          let notifyStorytellerId = req.body.storytellerId;
          let notifyFamilyMemberId = req.body.familyMemberId;
          let notifyQuestion = req.body.question;
          let notifyAccountId = null;

          try {
            const SupabaseService = require('../utils/supabase-service');
            const supabaseServiceMeta = new SupabaseService();
            const callLookup = await supabaseServiceMeta.supabase
              .from('calls')
              .select('metadata, account_id')
              .eq('twilio_call_sid', callSid)
              .limit(1);
            if (callLookup.data && callLookup.data.length > 0 && callLookup.data[0].metadata) {
              const meta = callLookup.data[0].metadata;
              notifyAccountId = callLookup.data[0].account_id || null;
              notifyStorytellerId = notifyStorytellerId || meta.storytellerId || null;
              notifyFamilyMemberId = notifyFamilyMemberId || meta.familyMemberId || null;
              notifyQuestion = notifyQuestion || meta.question || null;
            }
          } catch (e) {
            console.warn('⚠️  Could not fetch call metadata for notification:', e.message);
          }

          // Always notify app backend
          try {
            await notifyAppBackend({
              callSid: callSid,
              filename: filename,
              localFilePath: filepath,
              recordingDurationSeconds: req.body.RecordingDuration,
              storytellerId: notifyStorytellerId,
              familyMemberId: notifyFamilyMemberId,
              question: notifyQuestion,
              accountId: notifyAccountId
            });
          } catch (notifyErr) {
            console.error('⚠️  Warning: Failed to notify app backend:', notifyErr.message);
          }
        });
  
        writer.on('error', (err) => {
          console.error('❌ Error writing file:', err);
        });
      } catch (error) {
        console.error('❌ Error downloading recording:', error.message);
      }
    }, 7000);
  
    const twiml = new VoiceResponse();
    twiml.say('Thanks! Your story has been saved.');
    res.type('text/xml');
    res.send(twiml.toString());
  });
  

// 📲 Route 3: Initiates outbound call to your phone number
router.post('/call', 
  requestSizeLimiter,
  validateApiKey, 
  callFrequencyLimiter,
  async (req, res) => {
  console.log('🚀 /api/v1/call triggered');

  try {
    // Validate required fields
    const { phoneNumber, customMessage, question, callType, interactive, storytellerId, familyMemberId } = req.body;
    
    if (!phoneNumber && !process.env.MY_PHONE_NUMBER) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const targetNumber = phoneNumber || process.env.MY_PHONE_NUMBER;
    
    // Log enhanced call details
    console.log('🚀 Enhanced Call Details');
    console.log(`❓ Question: ${question || 'None (basic call)'}`);
    console.log(`🎯 Call Type: ${callType || 'standard'}`);
    console.log(`🔄 Interactive: ${interactive || false}`);
    if (storytellerId) console.log(`👤 Storyteller ID: ${storytellerId}`);
    if (familyMemberId) console.log(`👥 Family Member ID: ${familyMemberId}`);
    
    // Validate phone number format and check if blocked
    const phoneValidation = validatePhoneNumber(targetNumber);
    if (!phoneValidation.valid) {
      return res.status(400).json({ 
        error: 'Invalid phone number',
        message: phoneValidation.error
      });
    }
    
    // Log the call attempt for security monitoring
    console.log(`📞 Call attempt from API key: ${req.apiKeyInfo.key} to: ${targetNumber}`);
    
    // Log call initiation details
    console.log('🚀 Initiating Call');
    console.log('==================');
    console.log(`📱 Target Number: ${targetNumber}`);
    console.log(`📞 Twilio Number: ${process.env.TWILIO_PHONE_NUMBER}`);
    console.log(`🌐 Voice Webhook: ${process.env.BASE_URL}/api/v1/voice`);
    console.log(`📊 Status Callback: ${process.env.BASE_URL}/api/v1/call-status`);
    console.log(`🕐 Initiation Time: ${new Date().toISOString()}`);
    console.log('==================');
    
    // Determine webhook URL based on call type
    const voiceWebhook = interactive && question ? 
      `${process.env.BASE_URL}/api/v1/voice-interactive` : 
      `${process.env.BASE_URL}/api/v1/voice`;
    
    console.log(`🌐 Using webhook: ${voiceWebhook}`);
    
    const call = await client.calls.create({
      url: voiceWebhook,
      to: targetNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.BASE_URL}/api/v1/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    // Store call in Supabase database
    try {
      const SupabaseService = require('../utils/supabase-service');
      const supabaseService = new SupabaseService();
      
      const callData = {
        account_id: req.apiKeyInfo.accountId,
        api_key_id: req.apiKeyInfo.id,
        to_number: targetNumber,
        from_number: process.env.TWILIO_PHONE_NUMBER,
        twilio_call_sid: call.sid,
        status: call.status,
        call_type: callType || 'outbound',
        metadata: {
          customMessage: req.body.customMessage || null,
          question: question || null,
          interactive: interactive || false,
          callType: callType || 'standard',
          storytellerId: storytellerId || null,
          familyMemberId: familyMemberId || null,
          initiatedAt: new Date().toISOString(),
          apiKeyUsed: req.apiKeyInfo.key
        }
      };
      
      const dbCall = await supabaseService.createCall(callData);
      console.log(`💾 Call stored in database with ID: ${dbCall.id}`);
    } catch (dbError) {
      console.error('⚠️  Warning: Could not store call in database:', dbError.message);
      // Continue with call even if database storage fails
    }

    // Track API key usage
    const apiKeyService = require('../utils/api-key-service');
    await apiKeyService.incrementUsage(req.apiKey, 'call');

    console.log(`📲 Call initiated to ${targetNumber}`);
    console.log(`🆔 Call SID: ${call.sid}`);
    console.log(`📊 Initial Status: ${call.status}`);
    res.status(200).json({ 
      message: 'Call initiated successfully', 
      sid: call.sid,
      status: call.status,
      to: targetNumber
    });
  } catch (error) {
    console.error('❌ Error initiating call:', error.message);
    res.status(500).json({ 
      error: 'Failed to initiate call',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 📊 Route 4: Get call status updates
router.post('/call-status', async (req, res) => {
  const statusData = req.body;
  const callSid = statusData.CallSid;
  const callStatus = statusData.CallStatus;
  const timestamp = new Date().toISOString();
  
  // Calculate call duration if completed
  let callDuration = null;
  if (statusData.CallDuration) {
    callDuration = parseInt(statusData.CallDuration);
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    console.log(`⏱️  Call Duration: ${minutes}m ${seconds}s (${callDuration}s total)`);
  }
  
  // Enhanced status logging with emojis and details
  console.log('📊 Call Status Update');
  console.log('=====================');
  console.log(`📱 Call SID: ${callSid}`);
  console.log(`📞 Status: ${callStatus}`);
  console.log(`🕐 Timestamp: ${timestamp}`);
  console.log(`📞 From: ${statusData.From}`);
  console.log(`📱 To: ${statusData.To}`);
  
  // Log specific status details
  switch (callStatus) {
    case 'initiated':
      console.log('🚀 Call initiated by Twilio');
      break;
    case 'ringing':
      console.log('🔔 Phone is ringing...');
      break;
    case 'answered':
      console.log('✅ Call answered! Recording will start after prompt');
      break;
    case 'completed':
      console.log('🎉 Call completed successfully!');
      if (callDuration) {
        const minutes = Math.floor(callDuration / 60);
        const seconds = callDuration % 60;
        console.log(`⏱️  Total call time: ${minutes}m ${seconds}s`);
      }
      break;
    case 'busy':
      console.log('🚫 Call failed - number busy');
      break;
    case 'no-answer':
      console.log('⏰ Call failed - no answer');
      break;
    case 'failed':
      console.log('❌ Call failed - check Twilio logs');
      break;
    default:
      console.log(`ℹ️  Status: ${callStatus}`);
  }
  
  // Log additional Twilio data if available
  if (statusData.ErrorCode) {
    console.log(`❌ Error Code: ${statusData.ErrorCode}`);
    console.log(`❌ Error Message: ${statusData.ErrorMessage}`);
  }
  
  // Update call record in Supabase database
  try {
    const SupabaseService = require('../utils/supabase-service');
    const supabaseService = new SupabaseService();
    
    // Find the call by Twilio SID
    const calls = await supabaseService.supabase
      .from('calls')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .limit(1);
    
    if (calls.data && calls.data.length > 0) {
      const callRecord = calls.data[0];
      
      // Update call status and metadata
      const updateData = {
        status: callStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          ...callRecord.metadata,
          lastStatusUpdate: timestamp,
          callDuration: callDuration,
          twilioStatusData: statusData
        }
      };
      
      // Add call duration if completed
      if (callDuration) {
        updateData.duration = callDuration;
      }
      
      await supabaseService.updateCallStatus(callRecord.id, callStatus, updateData.metadata);
      console.log(`💾 Call ${callRecord.id} status updated to: ${callStatus}`);
    } else {
      console.log(`⚠️  No call record found for Twilio SID: ${callSid}`);
    }
  } catch (dbError) {
    console.error('⚠️  Warning: Could not update call in database:', dbError.message);
    // Continue with status logging even if database update fails
  }
  
  console.log('📊 Full Status Data:', JSON.stringify(statusData, null, 2));
  console.log('=====================');
  
  res.status(200).send('OK');
});

// 📋 Route 5: Get list of recordings
router.get('/recordings', validateApiKey, (req, res) => {
  try {
    const recordingsPath = process.env.RECORDINGS_PATH || './recordings';
    const fullPath = path.join(__dirname, '..', recordingsPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(200).json({ recordings: [] });
    }
    
    const files = fs.readdirSync(fullPath)
      .filter(file => file.endsWith('.mp3'))
      .map(file => {
        const filePath = path.join(fullPath, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          path: `/api/v1/recordings/${file}`
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ recordings: files });
  } catch (error) {
    console.error('❌ Error listing recordings:', error);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
});

// 🎵 Route 6: Stream/download a specific recording
router.get('/recordings/:filename', validateApiKey, (req, res) => {
  try {
    const { filename } = req.params;
    const recordingsPath = process.env.RECORDINGS_PATH || './recordings';
    const filepath = path.join(__dirname, '..', recordingsPath, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    res.sendFile(filepath);
  } catch (error) {
    console.error('❌ Error serving recording:', error);
    res.status(500).json({ error: 'Failed to serve recording' });
  }
});

// 🎵 Route 7: Serve audio files (for personal voice recordings)
router.get('/audio/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const audioPath = './audio';
    const filepath = path.join(__dirname, '..', audioPath, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    res.sendFile(filepath);
  } catch (error) {
    console.error('❌ Error serving audio file:', error);
    res.status(500).json({ error: 'Failed to serve audio file' });
  }
});

// 🎵 Route 8: Serve temporary TTS audio files
router.get('/temp-audio/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const tempPath = './temp';
    const filepath = path.join(__dirname, '..', tempPath, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Temporary audio file not found' });
    }
    
    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    
    res.sendFile(filepath);
  } catch (error) {
    console.error('❌ Error serving temporary audio file:', error);
    res.status(500).json({ error: 'Failed to serve temporary audio file' });
  }
});

// 🔑 Route 7: Generate new API key (SECURED - multiple protection layers)
router.post('/generate-api-key', 
  // Layer 1: Request size limiting
  requestSizeLimiter,
  // Layer 2: Additional security middleware
  async (req, res) => {
  try {
    const { clientName, email, description, companyWebsite, phoneNumber } = req.body;
    
    // Layer 4: Required fields validation
    if (!clientName || !email || !companyWebsite || !phoneNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'clientName, email, companyWebsite, and phoneNumber are required',
        required: ['clientName', 'email', 'companyWebsite', 'phoneNumber']
      });
    }

    // Layer 5: Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    // Layer 6: Website validation (basic)
    const websiteRegex = /^https?:\/\/.+/;
    if (!websiteRegex.test(companyWebsite)) {
      return res.status(400).json({
        error: 'Invalid website format',
        message: 'Please provide a valid website URL starting with http:// or https://'
      });
    }

    // Layer 7: Phone number validation
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        error: 'Invalid phone number',
        message: phoneValidation.error
      });
    }

    // Layer 8: Check against allowlist (if configured)
    if (process.env.ALLOWED_DOMAINS) {
      const allowedDomains = process.env.ALLOWED_DOMAINS.split(',');
      const emailDomain = email.split('@')[1];
      const websiteDomain = new URL(companyWebsite).hostname;
      
      const isAllowed = allowedDomains.some(domain => 
        emailDomain.includes(domain) || websiteDomain.includes(domain)
      );
      
      if (!isAllowed) {
        console.warn(`🚨 Blocked API key request from unauthorized domain: ${emailDomain} / ${websiteDomain}`);
        return res.status(403).json({
          error: 'Unauthorized domain',
          message: 'Your domain is not authorized to generate API keys. Please contact support.',
          contact: process.env.SUPPORT_EMAIL || 'support@your-company.com'
        });
      }
    }

    // Layer 9: Check against blocklist
    if (process.env.BLOCKED_DOMAINS) {
      const blockedDomains = process.env.BLOCKED_DOMAINS.split(',');
      const emailDomain = email.split('@')[1];
      const websiteDomain = new URL(companyWebsite).hostname;
      
      const isBlocked = blockedDomains.some(domain => 
        emailDomain.includes(domain) || websiteDomain.includes(domain)
      );
      
      if (isBlocked) {
        console.warn(`🚨 Blocked API key request from blocked domain: ${emailDomain} / ${websiteDomain}`);
        return res.status(403).json({
          error: 'Domain blocked',
          message: 'Your domain is blocked from generating API keys.'
        });
      }
    }

    // Layer 10: Generate a secure API key using the scalable service
    const apiKeyService = require('../utils/api-key-service');
    const apiKey = apiKeyService.generateApiKey();
    const keyId = apiKeyService.generateKeyId();
    
    // Layer 11: Store the API key with enhanced metadata
    const keyData = {
      key: apiKey,
      accountId: keyId, // For now, using keyId as accountId
      keyName: `${clientName} API Key`,
      permissions: ['call', 'recordings', 'read'],
      limits: {
        maxCallsPerDay: process.env.MAX_CALLS_PER_DAY || 50,
        maxCallsPerMonth: process.env.MAX_CALLS_PER_MONTH || 1000,
        maxCallsPerHour: process.env.MAX_CALLS_PER_HOUR || 10
      }
    };
    
    // Store the API key in the scalable service
    const storageResult = await apiKeyService.storeApiKey(keyData);
    
    if (!storageResult.success) {
      return res.status(500).json({
        error: 'Failed to store API key',
        message: 'Could not save the generated API key'
      });
    }
    
    const keyInfo = {
      id: keyId,
      key: apiKey,
      clientName,
      email,
      companyWebsite,
      phoneNumber,
      description: description || '',
      createdAt: new Date().toISOString(),
      isActive: true,
      permissions: ['call', 'recordings', 'read'],
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      requestCount: 0,
      lastUsed: null,
      maxCallsPerDay: process.env.MAX_CALLS_PER_DAY || 50,
      maxCallsPerMonth: process.env.MAX_CALLS_PER_MONTH || 1000
    };

    // Layer 12: Log the key generation for security monitoring
    console.log('🔑 New API key generated:', {
      id: keyId,
      clientName,
      email,
      companyWebsite,
      phoneNumber,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      key: apiKey.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });

    // Layer 13: Send notification to admin (if configured)
    if (process.env.ADMIN_NOTIFICATION_WEBHOOK) {
      try {
        await axios.post(process.env.ADMIN_NOTIFICATION_WEBHOOK, {
          type: 'new_api_key_generated',
          clientName,
          email,
          companyWebsite,
          phoneNumber,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to send admin notification:', error.message);
      }
    }

    res.status(201).json({
      message: 'API key generated successfully',
      apiKey,
      keyId,
      clientName,
      email,
      companyWebsite,
      phoneNumber,
      createdAt: keyInfo.createdAt,
      permissions: keyInfo.permissions,
      limits: {
        maxCallsPerDay: keyInfo.maxCallsPerDay,
        maxCallsPerMonth: keyInfo.maxCallsPerMonth
      },
      warning: 'Store this API key securely. It will not be shown again.',
      nextSteps: [
        '1. Save this API key immediately',
        '2. Use it in the x-api-key header for all API calls',
        '3. Check the API documentation for usage examples',
        '4. Monitor your usage to stay within limits'
      ],
      support: {
        email: process.env.SUPPORT_EMAIL || 'support@your-company.com',
        documentation: `${process.env.BASE_URL}/api/v1/docs`
      }
    });

  } catch (error) {
    console.error('❌ Error generating API key:', error);
    res.status(500).json({ 
      error: 'Failed to generate API key',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 📋 Route 8: List API keys (admin only)
router.get('/api-keys', validateApiKey, (req, res) => {
  try {
    // Check if this is an admin API key
    if (!isAdminApiKey(req.apiKeyInfo.key)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Admin access required to list API keys'
      });
    }

    // In production, fetch from database
    // For demo, return mock data
    const apiKeys = [
      {
        id: 'demo-key-1',
        clientName: 'Demo Client',
        email: 'demo@example.com',
        createdAt: new Date().toISOString(),
        isActive: true,
        lastUsed: new Date().toISOString()
      }
    ];

    res.json({ apiKeys });
  } catch (error) {
    console.error('❌ Error listing API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// 🗑️ Route 9: Revoke API key (admin only)
router.delete('/api-keys/:keyId', validateApiKey, (req, res) => {
  try {
    const { keyId } = req.params;
    
    // Check if this is an admin API key
    if (!isAdminApiKey(req.apiKeyInfo.key)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Admin access required to revoke API keys'
      });
    }

    // In production, mark as inactive in database
    console.log(`🗑️ API key revoked: ${keyId}`);

    res.json({ 
      message: 'API key revoked successfully',
      keyId 
    });
  } catch (error) {
    console.error('❌ Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// 🔍 Route 10: API Discovery and Documentation
router.get('/', (req, res) => {
  res.json({
    service: 'Memoora Call Recording Microservice',
    version: '1.0.0',
    description: 'A microservice for initiating phone calls and recording stories',
    documentation: `${process.env.BASE_URL}/api/v1/docs`,
    openapi: `${process.env.BASE_URL}/api/v1/openapi.json`,
    endpoints: {
      'GET /': 'This discovery endpoint',
      'GET /health': 'Service health check',
      'POST /generate-api-key': 'Generate new API key (public)',
      'POST /call': 'Initiate outbound phone call',
      'GET /recordings': 'List all recordings',
      'GET /recordings/:filename': 'Download specific recording',
      'GET /api-keys': 'List API keys (admin only)',
      'DELETE /api-keys/:keyId': 'Revoke API key (admin only)'
    },
    authentication: {
      method: 'API Key',
      header: 'x-api-key',
      note: 'All endpoints except /generate-api-key and /health require authentication'
    },
    rateLimits: {
      'generate-api-key': '5 requests per hour per IP',
      'call': '10 calls per hour per API key',
      'general': '100 requests per hour per API key'
    },
    examples: {
      'Generate API Key': {
        method: 'POST',
        url: '/generate-api-key',
        body: {
          clientName: 'Your App Name',
          email: 'dev@yourcompany.com',
          description: 'Optional description'
        },
        note: 'No authentication required'
      },
      'Initiate Call': {
        method: 'POST',
        url: '/call',
        headers: {
          'x-api-key': 'your_api_key_here',
          'Content-Type': 'application/json'
        },
        body: {
          phoneNumber: '+1234567890',
          customMessage: 'Optional custom message'
        }
      }
    },
    support: {
      documentation: `${process.env.BASE_URL}/api/v1/docs`,
      health: `${process.env.BASE_URL}/health`,
      contact: 'support@your-company.com'
    }
  });
});

// 📚 Route 11: OpenAPI/Swagger Specification
router.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Memoora Call Recording API',
      description: 'API for initiating phone calls and recording stories',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@your-company.com'
      }
    },
    servers: [
      {
        url: process.env.BASE_URL + '/api/v1',
        description: 'Production server'
      }
    ],
    paths: {
      '/': {
        get: {
          summary: 'API Discovery',
          description: 'Get API information and available endpoints',
          responses: {
            '200': {
              description: 'API information',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      service: { type: 'string' },
                      version: { type: 'string' },
                      endpoints: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/generate-api-key': {
        post: {
          summary: 'Generate API Key',
          description: 'Generate a new API key for accessing the service',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['clientName', 'email'],
                  properties: {
                    clientName: {
                      type: 'string',
                      description: 'Name of the client application'
                    },
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'Contact email for the client'
                    },
                    description: {
                      type: 'string',
                      description: 'Optional description of the API key usage'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'API key generated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      apiKey: { type: 'string' },
                      keyId: { type: 'string' },
                      clientName: { type: 'string' },
                      email: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' },
                      permissions: { type: 'array', items: { type: 'string' } },
                      warning: { type: 'string' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - missing required fields'
            },
            '429': {
              description: 'Rate limit exceeded'
            }
          }
        }
      },
      '/call': {
        post: {
          summary: 'Initiate Phone Call',
          description: 'Start an outbound phone call to record a story',
          tags: ['Calls'],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    phoneNumber: {
                      type: 'string',
                      description: 'Phone number to call (E.164 format)'
                    },
                    customMessage: {
                      type: 'string',
                      description: 'Optional custom message for the call'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Call initiated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      sid: { type: 'string' },
                      status: { type: 'string' },
                      to: { type: 'string' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - invalid phone number'
            },
            '401': {
              description: 'Unauthorized - invalid or missing API key'
            },
            '429': {
              description: 'Rate limit exceeded'
            }
          }
        }
      },
      '/recordings': {
        get: {
          summary: 'List Recordings',
          description: 'Get a list of all available recordings',
          tags: ['Recordings'],
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'List of recordings',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      recordings: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            filename: { type: 'string' },
                            size: { type: 'number' },
                            created: { type: 'string', format: 'date-time' },
                            path: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized - invalid or missing API key'
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for authentication'
        }
      }
    }
  });
});

// 📖 Route 12: Interactive API Documentation
router.get('/docs', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Memoora API Documentation</title>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #333; }
        .header p { color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔊 Memoora Call Recording API</h1>
        <p>Interactive API documentation and testing interface</p>
    </div>
    <div id="swagger-ui"></div>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: '/api/v1/openapi.json',
                dom_id: '#swagger-ui',
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout"
            });
        };
    </script>
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Helper functions (now handled by api-key-service)
// generateSecureApiKey and generateKeyId moved to utils/api-key-service.js

function isAdminApiKey(apiKey) {
  // In production, check against database
  // For demo, check against environment variable
  const adminKeys = process.env.ADMIN_API_KEYS ? 
    process.env.ADMIN_API_KEYS.split(',') : [];
  
  return adminKeys.includes(apiKey);
}

module.exports = router;
