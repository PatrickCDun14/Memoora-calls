// utils/notifyAppBackend.js
const axios = require('axios');
const fs = require('fs').promises;
const crypto = require('crypto');

const APP_BACKEND_URL = process.env.APP_BACKEND_URL || 'http://localhost:5001';
const API_KEY = process.env.MEMOORA_CALL_SERVICE_API_KEY;

function signPayload({ body, secret, timestamp }) {
  // CRITICAL: Format must be exactly "timestamp.body"
  const dataString = `${timestamp}.${JSON.stringify(body)}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataString)
    .digest('hex');
    
  return signature;
}

async function notifyAppBackend({ callSid, filename, localFilePath, recordingDurationSeconds, storytellerId, familyMemberId, question, accountId }) {
  if (!API_KEY) {
    console.error('Missing MEMOORA_CALL_SERVICE_API_KEY; skipping webhook');
    return;
  }
  
  // 🔍 Debug: Show the API key being used (first 8 chars for security)
  console.log('🔑 Using API Key:', API_KEY.substring(0, 8) + '...');
  console.log('🔗 Backend URL:', APP_BACKEND_URL);

  let fileSize = null;
  try {
    if (localFilePath) fileSize = (await fs.stat(localFilePath)).size;
  } catch (e) {
    console.warn('Could not read file size:', e.message);
  }

  const payload = {
    callSid,
    filename,                        // e.g. story-1755613034299.mp3
    durationSeconds: Number(recordingDurationSeconds) || null,
    fileSize,
    storytellerId,                   // optional
    familyMemberId,                  // optional
    question                         // optional
  };

  try {
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = signPayload({ body: payload, secret: API_KEY, timestamp: ts });

    // 🔍 Debug logging for HMAC verification
    console.log('🔐 Webhook Debug Info:');
    console.log(`   Timestamp: ${ts}`);
    console.log(`   Body: ${JSON.stringify(payload)}`);
    console.log(`   Data String: ${ts}.${JSON.stringify(payload)}`);
    console.log(`   Generated Signature: ${signature}`);

    await axios.post(`${APP_BACKEND_URL}/api/calls/recording-complete`, payload, {
      headers: {
        'Content-Type': 'application/json',
        // Back-compat simple API key (optional)
        'x-api-key': API_KEY,
        // HMAC headers (recommended)
        'x-timestamp': ts,
        'x-signature': `sha256=${signature}`,
        ...(accountId ? { 'x-account-id': String(accountId) } : {})
      },
      timeout: parseInt(process.env.MICROSERVICE_TIMEOUT) || 30000
    });
    console.log('✅ Notified app backend recording-complete:', payload);
  } catch (err) {
    console.error('❌ Failed notifying app backend:', err.response?.data || err.message);
  }
}

module.exports = { notifyAppBackend };
