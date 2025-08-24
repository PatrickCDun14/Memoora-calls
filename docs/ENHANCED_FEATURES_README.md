# 🎯 Enhanced Memoora Microservice - Question-Based Calling

## 🚀 What's New

Your **Memoora Call Recording Microservice** now supports **question-based calling**! Instead of just playing a basic greeting, the microservice can now:

- ✅ **Read specific questions** to storytellers during phone calls
- ✅ **Use AI-powered TTS** (OpenAI) for natural-sounding questions
- ✅ **Support interactive call flows** with dynamic content
- ✅ **Fall back gracefully** to basic calls if TTS fails
- ✅ **Track question metadata** in your database

## 🎙️ How It Works

### **Before (Basic Calls)**
```
1. Call initiated → 2. Phone rings → 3. User answers → 4. Static greeting → 5. Recording starts
```

### **After (Enhanced Calls)**
```
1. Call initiated → 2. Phone rings → 3. User answers → 4. AI reads question → 5. User responds → 6. Recording continues
```

## 🔧 New API Parameters

### **Enhanced Call Request**
```javascript
POST /api/v1/call
{
  "phoneNumber": "+1234567890",
  "customMessage": "Optional custom message",
  "question": "What was your most memorable childhood experience?", // NEW!
  "callType": "storytelling", // NEW!
  "interactive": true // NEW!
}
```

### **New Fields Explained**
- **`question`** - The specific question to ask the storyteller
- **`callType`** - Type of call (e.g., "storytelling", "interview", "survey")
- **`interactive`** - Whether to use the enhanced question-based flow

## 🎯 Use Cases

### **1. Storytelling Apps**
```javascript
{
  "question": "Tell me about the time you overcame your biggest fear",
  "callType": "storytelling",
  "interactive": true
}
```

### **2. Survey Calls**
```javascript
{
  "question": "What do you think about our new product features?",
  "callType": "survey",
  "interactive": true
}
```

### **3. Interview Calls**
```javascript
{
  "question": "Describe your most challenging project at work",
  "callType": "interview",
  "interactive": true
}
```

## 🏗️ Technical Implementation

### **New Routes Added**
- **`/voice-interactive`** - Handles question-based calls
- **`/temp-audio/{filename}`** - Serves TTS-generated audio files

### **TTS Service Integration**
- **OpenAI TTS** for high-quality voice synthesis
- **Multiple voice options** (alloy, nova, echo, fable, onyx, shimmer)
- **Automatic fallback** to basic Twilio TTS if OpenAI fails

### **Database Enhancements**
- **Question storage** in call metadata
- **Call type tracking** for analytics
- **Interactive flag** for call flow identification

## 🚀 Getting Started

### **Step 1: Set Environment Variables**
```bash
# Add to your .env file
TTS_PROVIDER=openai
ENABLE_QUESTION_READING=true
OPENAI_API_KEY=your_openai_api_key_here
```

### **Step 2: Test Enhanced Calls**
```bash
# Test locally
npm run test:enhanced

# Test with ngrok
npm run test:enhanced:ngrok
```

### **Step 3: Integrate with Your App**
```javascript
// Your main application can now send questions
const callData = {
  phoneNumber: '+1234567890',
  question: 'What was your favorite childhood memory?',
  callType: 'storytelling',
  interactive: true
};

const response = await fetch('http://localhost:5005/api/v1/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': yourApiKey
  },
  body: JSON.stringify(callData)
});
```

## 🎙️ TTS Configuration

### **Available Voices**
- **`alloy`** - Balanced and versatile
- **`nova`** - Warm and friendly  
- **`fable`** - Perfect for storytelling (default)
- **`echo`** - Clear and professional
- **`onyx`** - Deep and authoritative
- **`shimmer`** - Bright and energetic

### **Voice Selection**
```javascript
// In your call request, you can specify voice preferences
{
  "question": "Tell me a story",
  "callType": "storytelling",
  "interactive": true,
  "ttsOptions": {
    "voice": "fable",
    "speed": 1.0
  }
}
```

## 🔒 Security & Validation

### **Input Sanitization**
- **HTML/script tags removed** automatically
- **Text length limited** to 500 characters
- **XSS protection** built-in

### **Rate Limiting**
- **Enhanced calls** have separate rate limits
- **TTS generation** is rate-limited per API key
- **Fallback protection** if TTS service fails

## 📊 Monitoring & Analytics

### **Enhanced Call Metrics**
```javascript
// Your calls now include rich metadata
{
  "id": "uuid-here",
  "status": "completed",
  "call_type": "storytelling",
  "metadata": {
    "question": "What was your most memorable experience?",
    "interactive": true,
    "callType": "storytelling",
    "ttsUsed": true,
    "voice": "fable"
  }
}
```

### **Question Performance Tracking**
- **Which questions** generate longer responses
- **Call type success rates** 
- **TTS usage statistics**

## 🧪 Testing

### **Local Testing**
```bash
# Test TTS functionality
curl -X POST http://localhost:5005/api/v1/test-tts \
  -H "Content-Type: application/json" \
  -d '{"question": "What was your favorite childhood memory?"}'

# Test enhanced call flow
curl -X POST http://localhost:5005/api/v1/call \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "phoneNumber": "+1234567890",
    "question": "Tell me about your first day of school",
    "interactive": true
  }'
```

### **Integration Testing**
```bash
# Test from your main application
curl -X POST http://localhost:5001/api/calls/start-enhanced \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "storytellerId": "user-123",
    "question": "What was the most embarrassing thing that happened to you?",
    "callType": "storytelling"
  }'
```

## 🔍 Troubleshooting

### **Common Issues**

#### **"TTS is disabled" Warning**
- Check `ENABLE_QUESTION_READING=true` in your `.env`
- Verify `TTS_PROVIDER=openai` is set

#### **"OpenAI client not configured" Error**
- Ensure `OPENAI_API_KEY` is set in your `.env`
- Check your OpenAI API key is valid

#### **Question not being read**
- Verify `interactive: true` in your request
- Check the question is under 500 characters
- Ensure TTS service is working

#### **Audio file not found errors**
- Check the `temp/` directory exists
- Verify file permissions
- Check TTS audio generation logs

### **Debug Endpoints**
```http
GET /health - Service health check
GET /api/v1/ - API discovery
```

## 🚀 Deployment

### **Production Setup**
```bash
# Set production environment variables
NODE_ENV=production
TTS_PROVIDER=openai
ENABLE_QUESTION_READING=true
OPENAI_API_KEY=your_production_openai_key

# Deploy to Render
npm run deploy:render
```

### **Docker Updates**
```dockerfile
# TTS dependencies are automatically included
# No additional Docker configuration needed
```

## 📈 Performance Considerations

### **TTS Generation**
- **Audio files cached** temporarily
- **Automatic cleanup** of old files
- **Fallback to basic TTS** if OpenAI is slow

### **Call Flow Optimization**
- **Webhook routing** based on call type
- **Minimal latency** for interactive calls
- **Graceful degradation** on errors

## 🔮 Future Enhancements

### **Phase 2: Advanced Features**
- **Multi-language support** for questions
- **Dynamic question generation** using AI
- **Follow-up questions** based on responses
- **Voice cloning** for personalized experiences

### **Phase 3: AI Integration**
- **Question optimization** based on response quality
- **Response analysis** and scoring
- **Personalized question selection**

## 🎯 Success Metrics

- **User engagement** increases with specific questions
- **Call duration** improves due to focused storytelling
- **Recording quality** enhances with clear prompts
- **User satisfaction** rises with personalized experience

---

## 🚀 **Ready to Test?**

```bash
# 1. Set your OpenAI API key
echo "OPENAI_API_KEY=your_key_here" >> .env

# 2. Enable question reading
echo "ENABLE_QUESTION_READING=true" >> .env

# 3. Test enhanced calls
npm run test:enhanced

# 4. Check your phone - it will ring with a question!
```

**Your Memoora microservice is now enhanced and ready for question-based storytelling! 🎉📞❓**
