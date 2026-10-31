# HMHS Talker — Urdu Voice AI Conversation Prototype

[![GitHub stars](https://img.shields.io/github/stars/noity0/hmhs-talker?style=flat-square)](https://github.com/noity0/hmhs-talker/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/noity0/hmhs-talker?style=flat-square)](https://github.com/noity0/hmhs-talker/issues)
[![Last commit](https://img.shields.io/github/last-commit/noity0/hmhs-talker?style=flat-square)](https://github.com/noity0/hmhs-talker/commits/main)

> An experimental conversational interface exploring spoken Urdu interaction with a Gemini-powered assistant.

HMHS Talker is a React and TypeScript voice-assistant project with an Express backend. It combines a microphone-oriented interface, AI response generation, and a call-style conversation experience.

## Features

- Voice-first conversation interface.
- Urdu-focused interaction experience.
- Gemini-powered response generation.
- Call-style conversation UI.
- Responsive React interface.
- Server-side API integration.

Speech recognition and voice playback can vary by browser, operating system, language support, and microphone permissions. This repository should be treated as an experimental voice interface rather than a guaranteed telephony or phone-call service.

## How the flow works

```text
User speaks
    |
    v
Browser microphone / speech input
    |
    v
Express API + Gemini
    |
    v
Assistant response
    |
    v
Browser speech output / conversation UI
```

## Technology stack

- React 19 and TypeScript
- Vite 6
- Node.js and Express
- Google Gemini SDK (`@google/genai`)
- Tailwind CSS, Motion, and Lucide React

## Requirements

- Node.js 22 LTS recommended
- npm
- Gemini API key
- Microphone and a modern browser for voice interaction

## Setup on Windows

```powershell
git clone https://github.com/noity0/hmhs-talker.git
Set-Location hmhs-talker
npm install
```

Create your environment file:

```powershell
Copy-Item .env.example .env
notepad .env
```

Add your own Gemini key:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

Keep credentials private and never commit `.env`.

## Run locally

```powershell
npm run dev
```

For a production build:

```powershell
npm run build
npm start
```

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express/TypeScript development server |
| `npm run build` | Build the frontend and bundle the server |
| `npm start` | Start the built server |
| `npm run preview` | Preview the frontend build |
| `npm run lint` | Run TypeScript checks |

## Troubleshooting

- **Microphone unavailable:** Check browser permissions and confirm that the page is served from localhost or a secure HTTPS origin.
- **No spoken response:** Check browser speech-synthesis support and the selected system voice.
- **Gemini request fails:** Confirm `GEMINI_API_KEY` in the local environment and restart the server.
- **Port conflict:** Review the server output and free or reconfigure the port in the hosting environment.

## Privacy

Microphone input and conversation text can be sensitive. Only enable microphone access when needed, review the configured AI provider's privacy terms, and avoid sharing confidential conversations.

## Contributing

Bug reports should include browser/OS details, steps to reproduce, and non-sensitive error logs. Accessibility, language handling, and robust voice-state management are useful areas for improvement.

- [Issues](https://github.com/noity0/hmhs-talker/issues)
- [Source](https://github.com/noity0/hmhs-talker)

## License

Check the repository for a `LICENSE` file. If none is present, standard copyright restrictions apply.

## Search terms

Urdu voice assistant, Urdu AI, voice AI, speech interface, conversational AI, Gemini API, React, TypeScript, Express, Vite, HMHS Talker.
