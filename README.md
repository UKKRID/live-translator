# Live Translator

Real-time voice translation app built with Next.js, React, and Tailwind CSS.

## Features

- **Tab Audio Mode**: Capture audio from browser tabs (YouTube, etc.) and transcribe with OpenAI Whisper
- **Microphone Mode**: Real-time speech recognition using Web Speech API
- **Multi-language Support**: Auto-detect, Thai, English, Japanese, Korean, Chinese, Spanish, French, German, Vietnamese, Indonesian, Malay, Arabic
- **Instant Translation**: Translates recognized text using MyMemory API with Google Translate fallback

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local` and add your OpenAI API key:
```bash
cp .env.example .env.local
```

3. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (for Tab Audio) | Your OpenAI API key for Whisper STT |

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Speech Recognition**: Web Speech API (Microphone mode) / OpenAI Whisper API (Tab Audio mode)
- **Translation**: MyMemory API with Google Translate fallback

## Architecture

```
src/
├── app/
│   ├── api/whisper/route.ts    # Server-side proxy for OpenAI Whisper
│   ├── globals.css             # Global styles and animations
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page component
├── components/
│   ├── Header.tsx              # App header with logo and settings
│   ├── LanguageBar.tsx         # Language selection bar
│   ├── LanguagePicker.tsx      # Language picker modal
│   ├── MicButton.tsx           # Microphone toggle button
│   ├── ModeToggle.tsx          # Tab Audio / Microphone switcher
│   ├── SettingsModal.tsx       # Settings modal
│   └── TranslationContent.tsx  # Translation list and status display
└── lib/
    ├── types.ts                # TypeScript types and constants
    └── useTranslator.ts        # Custom hook for translation logic
```

## Security

- API keys are stored server-side only (never exposed to the client)
- Rate limiting applied to Whisper API endpoint
- All audio processing happens through secure server-side proxy
