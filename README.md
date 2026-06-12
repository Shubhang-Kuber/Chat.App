# Chat.App — Real-Time WebSocket Messaging

A real-time chat application built with **Node.js**, **Socket.io**, and **Firebase**, featuring a space-themed cockpit UI and a multi-layer API gateway with authentication and rate limiting.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Web Framework | Express 5 |
| Real-Time Transport | Socket.io 4 |
| Auth & Database | Firebase Admin SDK (Auth + Cloud Firestore) |
| Rate Limiting | express-rate-limit |
| Deployment | Render |

---

## Architecture

```
Client (Browser)
    │
    ├── HTTP GET /           → Serves index.html
    ├── HTTP static /style.css → Serves CSS
    └── WebSocket (Socket.io)
            │
            ▼
    ┌─────────────────────────────────┐
    │        API Gateway              │
    │                                 │
    │  Layer A: Rate Limiter          │  60 req/min per IP
    │  Layer B: HTTP Auth Middleware  │  Firebase JWT verification
    │  Layer C: Socket Handshake Auth │  Firebase JWT on ws connect
    └─────────────────────────────────┘
            │
            ▼
    ┌─────────────────────────────────┐
    │      Socket.io Event Pipeline   │
    │                                 │
    │  chatMessage → broadcast.emit   │  Fan-out to all other clients
    │             → Firestore write   │  Async persistence
    └─────────────────────────────────┘
            │
            ▼
    Firebase Cloud Firestore
    Collection: messages { text, timestamp, socketId }
```

### Key Design Decisions

- **`socket.broadcast.emit()`** — the sender's own message is never echoed back from the server. The client appends it locally for zero-latency feedback.
- **Firestore `serverTimestamp()`** — timestamps are assigned by the cloud database, not the client, ensuring consistency across all connected sessions.
- **Absolute path resolution via `path.join(__dirname, "public")`** — required for correct static asset serving on Render's file system.
- **JWT verified at both layers** — HTTP middleware guards REST routes; the Socket.io handshake interceptor (`io.use(...)`) guards WebSocket connections independently.

---

## Getting Started

### Prerequisites

- Node.js v18+
- A Firebase project with **Authentication** and **Cloud Firestore** enabled
- A Firebase service account JSON key

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Shubhang-Kuber/Chat.App.git
cd Chat.App

# 2. Install dependencies
npm install

# 3. Add your Firebase credentials
#    Place your service account key at the project root:
mv ~/Downloads/your-key.json ./firebase-service-account.json

# 4. Start the server
npm start
# Server starts on http://localhost:9000
```

### Cloud Deployment (Render)

Set the following environment variable in your Render service dashboard:

| Variable | Value |
|---|---|
| `FIREBASE_SECRET` | The full contents of your `firebase-service-account.json` as a JSON string |

The server checks `process.env.FIREBASE_SECRET` first and falls back to the local file, so no code changes are needed between environments.

---

## Project Structure

```
Chat.App/
├── index.js                    # Express server, Socket.io, API gateway
├── package.json
├── firebase-service-account.json  # Local only — never commit
└── public/
    ├── index.html              # Chat UI + Socket.io client
    └── style.css               # Glassmorphism space-cockpit theme
```

---

## API Gateway

### Rate Limiter (Layer A)
Applied globally to all incoming HTTP requests.

- **Window:** 60 seconds
- **Limit:** 60 requests per IP
- **Response on breach:** `HTTP 429` with a JSON error body

### HTTP Auth Middleware (Layer B)
Protects HTTP routes. Expects a Firebase ID token as a Bearer token.

```
Authorization: Bearer <firebase_id_token>
```

- Verifies the JWT cryptographically via Firebase Admin SDK
- Attaches `req.user = { uid, email, name }` on success
- Returns `HTTP 401` for missing/malformed headers, `HTTP 403` for invalid/expired tokens

### Socket.io Handshake Interceptor (Layer C)
Fires on every new WebSocket connection before any events are processed.

```js
// Client-side connection
const socket = io({ auth: { token: await user.getIdToken() } });
```

- Reads `socket.handshake.auth.token`
- Verifies via Firebase Admin SDK; rejects the handshake on failure
- Attaches the decoded token to `socket.user` for downstream event handlers

---

## Socket Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `chatMessage` | Client → Server | `string` | User sends a message |
| `message` | Server → Client | `string` | Broadcast to all other connected clients |

---

## Frontend

The UI is a single HTML/CSS/JS page with no framework dependencies.

- **Starfield** — 40 procedurally placed stars with randomised twinkle and drift animations driven by CSS custom properties set in JavaScript
- **Message bubbles** — sent messages align right, received messages align left
- **Auto-scroll** — message list scrolls to the latest entry on each new message
- **Enter key support** — submits the message without clicking Send

---

## License

ISC
