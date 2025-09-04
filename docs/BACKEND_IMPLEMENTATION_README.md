# 🎙️ Backend Transcription Implementation Guide

## 📋 **Overview**
This document outlines exactly what needs to be implemented in your main backend (`memoora-backend.onrender.com`) to support automatic transcription functionality from the Memoora microservice.

---

## ✅ **Current Status**

### **What's Working:**
- ✅ **Microservice transcription**: Fully implemented and working
- ✅ **Twilio transcription**: Successfully generating transcriptions
- ✅ **Transcription webhook**: Being sent from microservice to main backend
- ✅ **Recording webhook**: Already working (existing endpoint)

### **What's Missing:**
- ❌ **Transcription webhook endpoint**: Not implemented in main backend
- ❌ **Database schema**: Transcription columns not added to `recordings` table

---

## 🔧 **Implementation Steps**

### **1. Add Transcription Webhook Endpoint**

Add this new endpoint to your main backend router:

```javascript
/**
 * @route POST /api/calls/transcription-complete
 * @desc Handle webhook when a call transcription is complete
 * @access Public (webhook from Memoora service)
 */
router.post('/transcription-complete', async (req, res) => {
  try {
    console.log('📝 Transcription complete webhook received:', req.body);
    
    const {
      CallSid,
      RecordingSid,
      TranscriptionSid,
      TranscriptionText,
      TranscriptionStatus,
      TranscriptionUrl,
      callId,
      phoneNumber,
      customMessage,
      callType,
      storytellerId,
      familyMemberId,
      scheduledCallId,
      apiKeyInfo
    } = req.body;

    console.log('📝 Processing transcription for call:', CallSid);

    // Validate required fields
    if (!CallSid || !TranscriptionSid) {
      console.error('❌ Missing required fields:', { CallSid, TranscriptionSid });
      return res.status(400).json({ 
        error: 'Missing required fields: CallSid, TranscriptionSid' 
      });
    }

    // Find the recording by CallSid
    const { data: recording, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('call_sid', CallSid)
      .single();

    if (error || !recording) {
      console.error('❌ Recording not found for CallSid:', CallSid, error);
      return res.status(404).json({ 
        error: 'Recording not found for this CallSid',
        callSid: CallSid 
      });
    }

    console.log('✅ Found recording:', recording.id);

    // Update the recording with transcription data
    const { data: updatedRecording, error: updateError } = await supabase
      .from('recordings')
      .update({
        transcription_text: TranscriptionText,
        transcription_sid: TranscriptionSid,
        transcription_status: TranscriptionStatus,
        transcription_url: TranscriptionUrl,
        transcription_received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_processed: true,
        status: 'transcribed'
      })
      .eq('id', recording.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating recording with transcription:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update recording with transcription',
        details: updateError.message 
      });
    }

    console.log('✅ Transcription saved for recording:', recording.id);
    console.log('📝 Transcription text length:', TranscriptionText?.length || 0);

    res.json({
      success: true,
      message: 'Transcription saved successfully',
      recordingId: recording.id,
      transcriptionId: TranscriptionSid,
      textLength: TranscriptionText?.length || 0
    });

  } catch (error) {
    console.error('❌ Error processing transcription complete webhook:', error);
    res.status(500).json({ 
      error: 'Failed to process transcription',
      details: error.message 
    });
  }
});
```

### **2. Update Database Schema**

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Add transcription columns to the recordings table
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS transcription_text TEXT,
ADD COLUMN IF NOT EXISTS transcription_sid VARCHAR(255),
ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS transcription_url TEXT,
ADD COLUMN IF NOT EXISTS transcription_received_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance and easy querying
CREATE INDEX IF NOT EXISTS idx_recordings_transcription_status ON recordings(transcription_status);
CREATE INDEX IF NOT EXISTS idx_recordings_transcription_sid ON recordings(transcription_sid);
CREATE INDEX IF NOT EXISTS idx_recordings_call_sid ON recordings(call_sid);
```

---

## 🧪 **Testing**

### **Test the New Endpoint:**
```bash
curl -X POST "https://memoora-backend.onrender.com/api/calls/transcription-complete" \
  -H "Content-Type: application/json" \
  -d '{
    "CallSid": "CA60d058b0e518febe6e4a935d8d3a9936",
    "RecordingSid": "RE0b1290be2a9c4881bd42284c3f308574",
    "TranscriptionSid": "TRdfd818714723afa1538ce0cd85e5ff18",
    "TranscriptionText": "My favorites, it is definitely cheeseburgers. I really like cheeseburgers, i'm all of the golf cours...",
    "TranscriptionStatus": "completed",
    "TranscriptionUrl": "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Transcriptions/TRdfd818714723afa1538ce0cd85e5ff18",
    "callId": "call_1756951982288_3",
    "phoneNumber": "+13128484329"
  }'
```

### **Expected Response:**
```json
{
  "success": true,
  "message": "Transcription saved successfully",
  "recordingId": "uuid-here",
  "transcriptionId": "TRdfd818714723afa1538ce0cd85e5ff18",
  "textLength": 89
}
```

---

## 📈 **Monitoring & Logs**

### **Success Logs:**
- `📝 Transcription webhook received:` - Webhook received
- `✅ Found recording:` - Recording found in database
- `✅ Transcription saved for recording:` - Successfully saved

### **Error Logs:**
- `❌ Missing required fields:` - Validation error
- `❌ Recording not found for CallSid:` - Recording not found
- `❌ Failed to update recording with transcription:` - Database error

---

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **1. 404 Not Found Error**
- **Cause**: Endpoint not implemented
- **Solution**: Add the webhook endpoint to your main backend

#### **2. Recording Not Found Error**
- **Cause**: Recording wasn't saved or CallSid mismatch
- **Solution**: Check that recording webhook is working properly

#### **3. Database Update Error**
- **Cause**: Missing transcription columns
- **Solution**: Run the SQL commands to add transcription columns

---

## 🎯 **Summary**

**The transcription system is fully functional on the microservice side!** 

**What you need to do:**
1. Add the webhook endpoint to your main backend
2. Run the SQL commands to update your database schema
3. Deploy the changes

**What's already working:**
- ✅ Call flow with greeting and delays
- ✅ Recording and transcription on Twilio
- ✅ Webhook system sending data to main backend
- ✅ Comprehensive documentation

Once you implement the backend endpoint, transcriptions will be automatically stored in your database! 🎉
