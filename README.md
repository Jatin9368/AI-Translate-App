# AI Translate App

A full-stack mobile translation app like Google Translate — text, camera, and voice translation with 60+ languages including 30+ Indian languages.

---

## Project Structure

```
AI_Translate_App/
├── frontend/        # React Native (Expo)
├── backend/         # Node.js + Express API
└── database/        # MongoDB setup scripts
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [Expo Go](https://expo.dev/client) app on your Android/iOS device
- Google Translate API key (from [Google Cloud Console](https://console.cloud.google.com/))

---

## Step 1 — Install Expo CLI

```bash
npm install -g expo-cli eas-cli
```

---

## Step 2 — Backend Setup

```bash
cd AI_Translate_App/backend
npm install
```

Create your `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your keys:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai_translate_app
GOOGLE_TRANSLATE_API_KEY=your_actual_google_api_key
LIBRETRANSLATE_URL=https://libretranslate.com
LIBRETRANSLATE_API_KEY=your_libretranslate_key_optional
```

Start the backend:

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Backend runs at: `http://localhost:5000`

Test it:
```bash
curl http://localhost:5000/health
```

---

## Step 3 — MongoDB Setup

### Option A: Local MongoDB
Install MongoDB from https://www.mongodb.com/try/download/community and start it:
```bash
mongod
```

### Option B: MongoDB Atlas (Cloud — Recommended)
1. Go to https://cloud.mongodb.com
2. Create a free cluster
3. Get your connection string
4. Replace `MONGODB_URI` in `.env` with your Atlas URI

Run the setup script:
```bash
cd AI_Translate_App/database
node setup.js
```

---

## Step 4 — Frontend Setup

```bash
cd AI_Translate_App/frontend
npm install
```

Update your backend URL in `constants/config.js`:

```js
// For Android emulator:
export const API_BASE_URL = 'http://10.0.2.2:5000/api';

// For physical Android/iOS device (use your PC's local IP):
export const API_BASE_URL = 'http://192.168.1.XXX:5000/api';
```

Find your local IP:
- Windows: `ipconfig` → look for IPv4 Address
- Mac/Linux: `ifconfig` → look for inet

Start the app:
```bash
npx expo start
```

---

## Step 5 — Run on Android Device

1. Install **Expo Go** from Google Play Store
2. Make sure your phone and PC are on the **same WiFi network**
3. Run `npx expo start` in the frontend folder
4. Scan the QR code shown in terminal with Expo Go

---

## API Keys Setup

### Google Translate API (Primary)
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable "Cloud Translation API"
4. Go to Credentials → Create API Key
5. Copy the key to `.env` as `GOOGLE_TRANSLATE_API_KEY`

### LibreTranslate (Free Fallback)
- Public instance: https://libretranslate.com (free tier, rate limited)
- Self-host: https://github.com/LibreTranslate/LibreTranslate
- No API key needed for basic usage

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/translate` | Translate text |
| POST | `/api/detect-language` | Detect language |
| GET | `/api/history` | Get translation history |
| DELETE | `/api/history` | Clear history |
| GET | `/health` | Health check |

### Example: Translate
```bash
curl -X POST http://localhost:5000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "sourceLang": "auto", "targetLang": "hi"}'
```

---

## Features

- **Text Translation** — 60+ languages, auto-detect, swap languages
- **Camera Translation** — Real-time camera with OCR (requires ML Kit integration)
- **Voice Translation** — Microphone recording (requires STT API integration)
- **Translation History** — Stored in MongoDB, searchable
- **Copy / Share / Speak** — Output actions on every translation
- **30+ Indian Languages** — Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, and more

---

## Notes on Camera & Voice

Camera OCR and Voice STT require additional native integrations:

**Camera OCR** — Install Google ML Kit:
```bash
npm install @react-native-ml-kit/text-recognition
```
Then use `TextRecognition.recognize(imageUri)` after capture.

**Voice STT** — Options:
- Google Speech-to-Text API (send audio to backend)
- OpenAI Whisper API
- `@react-native-voice/voice` package (free, on-device)

These are noted in the code with clear TODO comments.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Network Error" on device | Update `API_BASE_URL` to your PC's local IP |
| "Translation failed" | Check Google API key in `.env` |
| MongoDB not connecting | Ensure MongoDB is running or check Atlas URI |
| Expo QR not scanning | Ensure phone and PC on same WiFi |
| Camera not working | Grant camera permission in device settings |
