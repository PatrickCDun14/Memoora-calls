# 🎭 Enhanced Voice Personalities

## Overview

The Memoora Call Service now features **enhanced, natural-sounding voice synthesis** that rivals Spotify's AI agent quality. The system uses advanced SSML (Speech Synthesis Markup Language) and optimized voice models to create warm, conversational experiences perfect for family storytelling.

## 🚀 Key Improvements

### **1. Natural Speech Patterns**
- **SSML Integration**: Uses Speech Synthesis Markup Language for natural pauses and emphasis
- **Sentence Pacing**: Automatically adds natural pauses between sentences
- **Word Emphasis**: Highlights key words for better flow and understanding
- **Prosody Control**: Adjusts rate, pitch, and volume for natural speech

### **2. Voice Personalities**
- **warm-elder**: Gentle, caring voice perfect for family stories (default)
- **friendly-guide**: Approachable and encouraging voice
- **storyteller**: Narrative voice with natural pacing
- **conversational**: Natural, everyday conversation style

### **3. Enhanced OpenAI TTS**
- **HD Model**: Uses `tts-1-hd` for superior audio quality
- **Optimized Voices**: `nova` voice for warm, conversational tone
- **Speed Control**: Slightly slower pacing (0.85x) for natural speech
- **Fallback System**: Graceful degradation if enhanced TTS fails

## 🎙️ Voice Personalities

### **Warm Elder (Default)**
- **Voice**: Nova
- **Speed**: 0.85x (slightly slower for warmth)
- **Style**: Warm, caring, gentle
- **Best For**: Family stories, emotional memories, elder conversations

### **Friendly Guide**
- **Voice**: Alloy
- **Speed**: 0.89x (slightly faster)
- **Style**: Approachable, encouraging, supportive
- **Best For**: General guidance, encouraging responses

### **Storyteller**
- **Voice**: Fable
- **Speed**: 0.81x (slower for narrative pacing)
- **Style**: Natural, narrative, engaging
- **Best For**: Story prompts, narrative questions

### **Conversational**
- **Voice**: Echo
- **Speed**: 0.94x (natural conversation pace)
- **Style**: Clear, professional, everyday
- **Best For**: General questions, professional contexts

## ⚙️ Configuration

### **Environment Variables**

```bash
# Voice Personality (default: warm-elder)
VOICE_PERSONALITY=warm-elder

# Voice Speed (default: 0.85)
VOICE_SPEED=0.85

# Voice Model (default: tts-1-hd)
VOICE_MODEL=tts-1-hd

# TTS Provider (default: openai)
TTS_PROVIDER=openai

# Enable Question Reading (default: true)
ENABLE_QUESTION_READING=true
```

### **Render Configuration**

The service automatically includes these voice settings in `render.yaml`:

```yaml
- key: VOICE_PERSONALITY
  value: warm-elder
- key: VOICE_SPEED
  value: 0.85
- key: VOICE_MODEL
  value: tts-1-hd
```

## 🧪 Testing Voice Personalities

### **1. Test Endpoint**

Test different voices via HTTP:

```bash
# Test warm-elder personality
curl "https://memoora-calls.onrender.com/api/v1/voice-test?personality=warm-elder" \
  -o test-warm-elder.mp3

# Test with custom text
curl "https://memoora-calls.onrender.com/api/v1/voice-test?personality=friendly-guide&text=Hello%20there!" \
  -o test-friendly-guide.mp3
```

### **2. Voice Information**

Get available personalities:

```bash
curl "https://memoora-calls.onrender.com/api/v1/voice-personalities"
```

### **3. Local Testing**

Run the enhanced voice test script:

```bash
node test-enhanced-voices.js
```

This creates `voice-tests/` directory with sample audio files for each personality.

## 🎯 How It Works

### **1. Text Processing**
```
Input: "What was the most memorable way someone ever stood up for you?"
↓
SSML: <speak><prosody rate="0.9" pitch="+1st" volume="loud">
        <emphasis level="moderate">What was</emphasis> the most memorable way...
        <break time="0.3s"/>
        someone ever stood up for you?
      </prosody></speak>
```

### **2. Voice Generation**
- **Model**: `tts-1-hd` (high-definition)
- **Voice**: `nova` (warm, conversational)
- **Speed**: 0.85x (natural pacing)
- **Style**: Warm (elevated pitch, louder volume)

### **3. Natural Enhancements**
- **Pauses**: 0.3s breaks between sentences
- **Emphasis**: Moderate emphasis on key words
- **Prosody**: Natural rate, pitch, and volume variations

## 🔧 Customization

### **Adding New Personalities**

Extend the `personalityConfigs` in `utils/tts-service.js`:

```javascript
'custom-personality': {
  voice: 'onyx',
  model: 'tts-1-hd',
  speed: 0.8,
  style: 'natural'
}
```

### **Modifying SSML Generation**

Customize the `convertToSSML` method for different speech patterns:

```javascript
// Add custom pauses
ssml += '<break time="0.5s"/>';

// Custom emphasis
ssml += '<emphasis level="strong">Important words</emphasis>';

// Pitch variations
ssml += '<prosody pitch="+2st">Excited text</prosody>';
```

## 📊 Performance

### **Audio Quality**
- **File Size**: ~20-30 KB per question (7-10 seconds)
- **Generation Time**: 2-5 seconds
- **Format**: MP3 (high quality, compressed)

### **Rate Limiting**
- **OpenAI**: 50 requests/minute (free tier)
- **Fallback**: Graceful degradation to basic TTS
- **Caching**: Temporary file storage for reuse

## 🚀 Future Enhancements

### **Planned Features**
- **Voice Cloning**: Custom voice training
- **Emotion Detection**: Automatic emotion-based voice selection
- **Multi-language**: Support for different languages
- **Real-time Adaptation**: Voice adjustment based on conversation flow

### **Alternative Providers**
- **ElevenLabs**: Industry-leading natural synthesis
- **Azure Cognitive Services**: Microsoft's neural TTS
- **Amazon Polly**: AWS neural voice synthesis

## 🎉 Results

The enhanced voice system provides:

✅ **Natural Speech**: Human-like pacing and emphasis  
✅ **Warm Tone**: Caring, family-friendly voice  
✅ **Professional Quality**: HD audio with clear pronunciation  
✅ **Flexible Personalities**: Different voices for different contexts  
✅ **Reliable Fallbacks**: Graceful degradation if issues occur  

Your callers will now experience **warm, natural conversations** that feel like talking to a caring family member rather than a robotic system! 🎭✨
