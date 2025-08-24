# 🎭 Interactive Phone Bot - Integration Guide

## Overview

The **Interactive Phone Bot** is a new feature integrated into your existing Memoora Call Recording Microservice. It provides **AI-powered conversational experiences** alongside your traditional one-way call recording system.

## 🚀 **Two Call Options Available:**

### **1. Traditional Calls (Existing)**
- **Endpoint**: `/api/v1/call`
- **Flow**: TTS question → Record response → Store in database
- **Use Case**: Simple story collection, one-way communication

### **2. Interactive Phone Bot (New)**
- **Endpoint**: `/api/v1/interactive-call`
- **Flow**: AI conversation → Dynamic follow-ups → Contextual responses
- **Use Case**: Engaging interviews, family story conversations, interactive experiences

## 🎯 **Interactive Phone Bot Features:**

### **AI-Powered Conversation Flow**
- **Whisper Transcription**: Real-time speech-to-text
- **GPT-4o-mini Reasoning**: Intelligent follow-up questions
- **Dynamic Flow**: Adapts conversation based on responses
- **Context Awareness**: Remembers what callers share

### **Natural Conversation Experience**
- **Curated Questions**: 10 meaningful family story prompts
- **Personalized Responses**: AI references previous answers
- **Warm Tone**: Caring, family-friendly voice
- **Flexible Duration**: 5-10 minute conversations

## 🏗️ **Architecture Integration:**

```
Your Microservice
├── /api/v1/call (existing - traditional calls)
├── /api/v1/voice (existing - TTS questions)
├── /api/v1/handle-recording (existing - store recordings)
└── NEW: Interactive Phone Bot
    ├── /api/v1/interactive-call (initiate interactive calls)
    ├── /api/v1/interactive/start (start conversation)
    ├── /api/v1/interactive/handle-recording (process responses)
    ├── /api/v1/interactive/status/:callSid (conversation status)
    └── /api/v1/interactive/summary/:callSid (AI summary)
```

## 📋 **Implementation Details:**

### **Core Components Added:**
- **`src/flow.js`**: Conversation flow management
- **`src/state.js`**: Conversation state management (Redis + Memory)
- **`src/twilio.js`**: Enhanced Twilio helpers
- **`src/openai.js`**: Whisper + GPT-4o-mini integration
- **`questions.json`**: Curated conversation questions

### **New Dependencies:**
- **`ioredis`**: Redis support for conversation state
- **Enhanced OpenAI integration**: Whisper + GPT-4o-mini

## 🎙️ **How It Works:**

### **1. Call Initiation**
```bash
POST /api/v1/interactive-call
{
  "phoneNumber": "+13128484329",
  "metadata": {
    "purpose": "family_story_interview"
  }
}
```

### **2. Conversation Flow**
1. **Welcome**: "Hi! Welcome to Memoora. I'm here to help you share your family stories. To get started, what's your name?"
2. **Dynamic Questions**: AI generates follow-ups based on responses
3. **Context Building**: Remembers names, stories, and details
4. **Natural Progression**: Flows through 10 meaningful questions
5. **AI Summary**: Generates personalized conversation summary

### **3. Question Examples**
- **Name & Purpose**: "What brings you to our service today?"
- **Childhood Memories**: "What's a childhood memory that still makes you smile?"
- **Family Lessons**: "What's something you learned from your grandparents?"
- **Personal Growth**: "What's a time when you felt truly proud of yourself?"
- **Legacy**: "What's one thing you hope people remember about you?"

## ⚙️ **Configuration:**

### **Environment Variables:**
```bash
# Required
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

# Optional
STATE_BACKEND=memory  # or 'redis'
REDIS_URL=redis://localhost:6379
```

### **Render Configuration:**
The service automatically includes these in `render.yaml`:
```yaml
- key: STATE_BACKEND
  value: memory
- key: REDIS_URL
  sync: false
```

## 🧪 **Testing:**

### **1. Test Interactive Endpoints:**
```bash
# Test conversation start
curl "http://localhost:5005/api/v1/interactive/test"

# Test voice personalities
curl "http://localhost:5005/api/v1/voice-personalities"

# Test enhanced TTS
curl "http://localhost:5005/api/v1/voice-test?personality=warm-elder"
```

### **2. Test Interactive Call:**
```bash
# Generate API key first
curl -X POST http://localhost:5005/api/v1/generate-key \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Test","email":"test@example.com"}'

# Then initiate interactive call
curl -X POST http://localhost:5005/api/v1/interactive-call \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"phoneNumber":"+13128484329"}'
```

## 💰 **Cost Optimization:**

### **Per 15-Minute Conversation:**
- **Twilio**: ~$0.13 (inbound minutes)
- **Whisper**: ~$0.09 (transcription)
- **TTS**: $0.00 (Twilio basic voice)
- **GPT-4o-mini**: ~$0.005 (reasoning)
- **Total**: ~**$0.25**

### **Cost-Saving Features:**
- **60-second recording limits** per response
- **Batch Whisper processing** (not streaming)
- **Efficient GPT prompts** with JSON responses
- **Memory fallback** if Redis unavailable

## 🚀 **Production Deployment:**

### **1. Render Deployment:**
- **Automatic**: Service includes all new endpoints
- **Environment Variables**: Set OpenAI and Twilio keys
- **State Backend**: Defaults to memory (upgrade to Redis later)

### **2. Twilio Configuration:**
- **Webhook**: Set to `/api/v1/interactive/start`
- **Recording Callback**: Set to `/api/v1/interactive/handle-recording`
- **Status Callback**: Set to `/api/v1/call-status`

### **3. Monitoring:**
- **Conversation Status**: `/api/v1/interactive/status/:callSid`
- **AI Summary**: `/api/v1/interactive/summary/:callSid`
- **Health Checks**: Enhanced with interactive bot status

## 🔧 **Customization:**

### **Modify Questions:**
Edit `questions.json` to change conversation flow:
```json
{
  "id": "q1",
  "prompt": "Your custom question here",
  "type": "free_text",
  "next": "q2",
  "context_key": "custom_key"
}
```

### **Add Voice Personalities:**
Extend `utils/tts-service.js` with new personalities:
```javascript
'custom-personality': {
  voice: 'onyx',
  model: 'tts-1-hd',
  speed: 0.8,
  style: 'natural'
}
```

### **Modify AI Behavior:**
Adjust prompts in `src/openai.js` for different conversation styles.

## 🎉 **Benefits:**

### **For Users:**
- **Engaging Experience**: Interactive conversations vs. static questions
- **Personalized**: AI remembers and references previous answers
- **Natural Flow**: Dynamic follow-ups based on responses
- **Comprehensive**: Covers multiple aspects of family stories

### **For Your Service:**
- **Two Call Types**: Traditional + Interactive options
- **Higher Engagement**: Longer, more meaningful conversations
- **AI Integration**: Whisper + GPT-4o-mini capabilities
- **Scalable**: Redis support for multi-instance deployment

## 🔮 **Future Enhancements:**

### **Planned Features:**
- **Voice Cloning**: Custom voice training
- **Emotion Detection**: Automatic emotion-based responses
- **Multi-language**: Support for different languages
- **Real-time Streaming**: Lower latency conversations

### **Upgrade Paths:**
- **Streaming STT**: Deepgram/Twilio Media Streams
- **Neural TTS**: Enhanced voice quality
- **Barge-in**: Allow caller interruptions
- **Analytics**: Detailed conversation insights

## ✅ **Current Status:**

**The Interactive Phone Bot is fully integrated and ready for testing!**

- **✅ Core System**: Flow, state, Twilio, OpenAI integration
- **✅ API Endpoints**: All interactive endpoints implemented
- **✅ Database Integration**: Works with existing Supabase setup
- **✅ Fallback System**: Graceful degradation if AI services fail
- **✅ Production Ready**: Deployable to Render immediately

## 🚀 **Next Steps:**

1. **Test Locally**: Use the test endpoints above
2. **Deploy to Render**: Service includes all new features
3. **Configure Twilio**: Set webhooks for interactive calls
4. **Monitor Usage**: Track conversation success rates
5. **Iterate**: Customize questions and AI behavior

**Your microservice now offers both traditional and interactive call experiences!** 🎭✨

---

**Ready to test the Interactive Phone Bot?** 🚀
