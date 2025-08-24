# Interactive Phone Bot (Low-Cost Edition)

Natural phone conversations that **ask curated questions**, **listen**, **process answers**, and **ask follow-ups** — optimized for **lowest cost**.

- Telephony: **Twilio Voice** (inbound local US)
- Speech-to-Text (STT): **OpenAI Whisper (audio.transcriptions)** (batch, super cheap)
- Text-to-Speech (TTS): **Twilio `<Say>` (Basic voice)** (free)
- Reasoning/flow control: **OpenAI GPT-4o-mini** (pennies)

> ⚠️ This design trades *latency* for *price*. Each turn records the caller’s answer, transcribes with Whisper, decides the next question, then speaks it. If you need *live interruptions / barge-in*, upgrade later to streaming STT (Deepgram/Twilio Media Streams).

---

## 1) What you’ll need (accounts & services)

1. **Twilio** account + a **US local phone number** (Voice enabled).
2. **OpenAI** API key (access to **Whisper** + **GPT-4o-mini**).
3. **Server hosting** for a simple Node.js app (Render, Fly.io, Railway, Heroku, or your own box).
4. (Dev only) **ngrok** for exposing localhost to Twilio.

---

## 2) Cost model (15 minutes)

- **Twilio inbound minutes**: ~$0.0085/min → **~$0.13**
- **Whisper transcription**: **~$0.006/min** → **~$0.09**
- **TTS** with Twilio `<Say>` Basic: **$0.00**
- **LLM (GPT-4o-mini)**: **pennies** (~$0.005)
- **Total**: ~**$0.25**

---

## 3) High-level flow

1. Caller dials your Twilio number.
2. Twilio hits your **/voice** webhook → you `<Say>` the current question and `<Record>` the caller’s answer.
3. Twilio POSTs to your **/handle-recording** webhook with a **RecordingUrl**.
4. Your server downloads the audio, sends to **Whisper** for **transcription**.
5. You call **GPT-4o-mini** with `{question, transcript, prior_answers, flow_config}`:
   - Validate/summarize the answer
   - Decide **next question id** (or finish)
6. Respond to Twilio with TwiML:
   - If more questions → `<Say>` next prompt + `<Record>` again (loop)
   - Else → `<Say>` closing message + `<Hangup>`

> State can be stored in **Redis** keyed by `CallSid` for reliability, or (MVP) an in-memory map (single instance only).

---

## 4) Repo structure

```
.
├─ README.md
├─ package.json
├─ .env.example
├─ server.js
├─ questions.json
└─ src/
   ├─ flow.js          # loads questions.json & next-step logic
   ├─ state.js         # in-memory or Redis state
   ├─ twilio.js        # helpers for TwiML & media download
   └─ openai.js        # Whisper & GPT-4o-mini helpers
```

---

## 5) Environment variables

Create `.env` (copy from `.env.example`):

```
PORT=3000
APP_BASE_URL=https://your-public-url.example   # ngrok/Render/Fly
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_NUMBER=+1XXXXXXXXXX
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
STATE_BACKEND=memory                          # or redis
REDIS_URL=redis://localhost:6379              # if using redis
```

---

## 6) questions.json (your curated flow)

```json
[
  {
    "id": "q1",
    "prompt": "Hi! To get started, what’s your name?",
    "type": "free_text",
    "next": "q2"
  },
  {
    "id": "q2",
    "prompt": "Nice to meet you, {{name}}. What brings you to our service today?",
    "type": "free_text",
    "next": "q3"
  },
  {
    "id": "q3",
    "prompt": "Got it. On a scale of 1 to 5, how urgent is this request?",
    "type": "number_1_5",
    "next": "end"
  }
]
```

---

## 7) Install & run

```bash
npm init -y
npm i express twilio dotenv node-fetch form-data openai
# (optional) npm i ioredis
node server.js
```

Expose it publicly (dev):
```bash
ngrok http 3000
# set APP_BASE_URL to the HTTPS ngrok URL
```

---

## 8) Twilio console setup

1. Buy a **US local number**.
2. Under the number’s **Voice & Fax** settings:
   - **A CALL COMES IN** → **Webhook** → `POST` → `https://YOUR_BASE_URL/voice`
3. Save.

---

## 9) server.js (minimal working example)

*(See chat for full code snippet, can be pasted into server.js)*

---

## 10) Production tips

- **State**: Use Redis keyed by `CallSid` for multi-instance reliability.
- **Timeouts**: Keep `<Record maxLength>` modest (10–20s) to lower STT cost.
- **Prompt**: Keep the system prompt short and deterministic; use `response_format: json_object`.
- **PII**: If capturing sensitive info, encrypt storage at rest and restrict logs.
- **Retry**: If Whisper or LLM fails, `<Say>` a graceful “let’s try that again” and `<Record>`.

---

## 11) Upgrades

- **Faster feel**: Switch to **Twilio Media Streams + streaming STT** (e.g., Deepgram).  
- **Nicer voice**: Use **Neural** `<Say>` voices or **ElevenLabs**.  
- **Interruptions** (“barge-in”): Requires streaming.  
- **Analytics**: Log each `questionId`, transcript, and JSON result to a DB.

---

## 12) License

MIT (adjust as needed).
