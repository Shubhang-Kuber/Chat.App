# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chat.App is a real-time web-based chat application built with **Node.js + Express** for the backend and **vanilla JavaScript** for the frontend. It uses **Socket.io** for WebSocket communication and **Firebase Cloud Firestore** for persistent message storage. The UI features a space-themed cockpit aesthetic with 3D CSS animations.

## Architecture

### Backend (`index.js`)
- **Express server** on dynamic port (default 9000, or `process.env.PORT` on cloud platforms like Render)
- **Socket.io** handles real-time message broadcasting:
  - Incoming `chatMessage` event is broadcast to all other clients
  - Messages are saved asynchronously to Firestore with timestamp
- **Firebase Admin SDK** manages Firestore writes
  - Credentials loaded from `process.env.FIREBASE_SECRET` (production) or local `firebase-service-account.json` file
  - Collection structure: `messages` with fields `text`, `timestamp`, `socketId`

### Frontend (`public/`)
- **Single-page HTML/CSS/JavaScript** application
- **Socket.io client** connects via `/socket.io/socket.io.js` auto-served by Express
- Message flow: user input → emit `chatMessage` → receive `message` event from server
- **CSS animations** use 3D transforms and keyframes for space effects (comets, asteroids, planets)

### Static Assets
- `public/index.html` — main chat interface with message display and input controls
- `public/style.css` — glassmorphism design with 3D space background animations

## Common Commands

```bash
# Install dependencies
npm install

# Start the server locally (listens on port 9000)
npm start

# The server serves static files from ./public and connects to Firestore
# Open http://localhost:9000 in a browser
```

## Environment Setup

For local development:
- Ensure `firebase-service-account.json` exists in the root directory with valid Firebase credentials
- The server will read this file on startup

For cloud deployment (e.g., Render):
- Set the `FIREBASE_SECRET` environment variable to the JSON credentials as a string
- The server checks `process.env.FIREBASE_SECRET` first; if not set, falls back to the local file

## Key Implementation Details

- **Message broadcasting** uses `socket.broadcast.emit()` so the sender's own message is not echoed back; the sender appends their message client-side
- **Firestore timestamps** use `admin.firestore.FieldValue.serverTimestamp()` for consistency across clients
- **Static file serving** uses `path.join(__dirname, "public")` to ensure absolute paths work on Render (critical for deployment)
- **CSS custom properties** (CSS variables) drive 3D animation values dynamically set in JavaScript

## Deployment Notes

The app is configured for **Render** cloud deployment:
- Dynamic port allocation via `process.env.PORT`
- Absolute path resolution ensures `style.css` and `index.html` load correctly in production
- Recent commits fixed static asset routing (public directory must be lowercase)
