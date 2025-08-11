require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const express = require('express');
const router = express.Router();
const { VoiceResponse } = require('twilio').twiml;
const twilio = require('twilio');
const { 
  validateApiKey, 
  callFrequencyLimiter, 
  validatePhoneNumber, 
  requestSizeLimiter,
  securityLogger 
} = require('../utils/security');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Apply security logging to all routes
router.use(securityLogger);

// 🔊 Route 1: Called when Twilio makes the outbound call and hits this Memoora endpoint
router.all('/voice', (req, res) => {
    const twiml = new VoiceResponse();
    twiml.say('Hello! Please share a story from your past after the beep. Press any key when finished.');
    twiml.record({
      action: `${process.env.BASE_URL}/api/v1/handle-recording`,
      method: 'POST',
      maxLength: process.env.MAX_RECORDING_DURATION || 120,
      finishOnKey: '#',
      playBeep: true
    });
    res.type('text/xml');
    res.send(twiml.toString());
  });  

// 🎙️ Route 2: Called by Twilio after recording is completed
router.post('/handle-recording', async (req, res) => {
    console.log('🎯 Incoming request to /handle-recording');
    console.log('🧾 Request body:', req.body);
  
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
  
        writer.on('finish', () => {
          console.log(`✅ Saved recording: ${filename}`);
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
    const { phoneNumber, customMessage } = req.body;
    
    if (!phoneNumber && !process.env.MY_PHONE_NUMBER) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const targetNumber = phoneNumber || process.env.MY_PHONE_NUMBER;
    
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
    
    const call = await client.calls.create({
      url: `${process.env.BASE_URL}/api/v1/voice`,
      to: targetNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      statusCallback: `${process.env.BASE_URL}/api/v1/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    console.log(`📲 Call initiated to ${targetNumber}`);
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
router.post('/call-status', (req, res) => {
  console.log('📊 Call status update:', req.body);
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

module.exports = router;
