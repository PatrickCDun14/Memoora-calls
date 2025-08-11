// memoora/utils/generatePrompt.js

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let promptQueue = []; // in-memory prompt buffer

async function fetchPrompts(count = 10) {
  for (let i = 0; i < count; i++) {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You help elders recall meaningful memories.' },
        { role: 'user', content: 'Give me a warm, open-ended storytelling prompt for an older adult.' }
      ],
      model: 'gpt-4'
    });

    promptQueue.push(completion.choices[0].message.content);
  }
}

// Call this on app start
fetchPrompts();

module.exports = async function getNextPrompt() {
  // If prompt buffer is low, refill in background
  if (promptQueue.length < 3) fetchPrompts();

  // Rotate through prompts
  return promptQueue.shift() || 'Tell us a story about your favorite childhood memory.';
};
