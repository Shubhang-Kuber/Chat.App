const http = require("http");
const express = require("express");
const path = require("path"); // For absolute path resolution
const { Server } = require("socket.io");
const admin = require("firebase-admin"); // Import Firebase Admin SDK
const rateLimit = require("express-rate-limit"); // Import Rate Limiter

// ==========================================
// 🚀 SERVER & APP INITIALIZATION
// ==========================================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ==========================================
// 🔑 FIREBASE ADMINISTRATIVE INITIALIZATION
// ==========================================
let serviceAccount;

if (process.env.FIREBASE_SECRET) {
  // When running live on Render, parse the secure environment variable string back into JSON
  serviceAccount = JSON.parse(process.env.FIREBASE_SECRET);
} else {
  // When running locally on your computer, fallback to your local file
  serviceAccount = require("./firebase-service-account.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // Create a reference to your Cloud Firestore database

// ==========================================
// 🛡️ API GATEWAY SUBSYSTEM: COMPONENT LAYERS
// ==========================================

// LAYER A: RATE LIMITING GATEWAY COMPONENT
const gatewayRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 Minute observation frame
    max: 60, // Limit each IP address to 60 telemetry requests per minute
    message: {
        status: 429,
        error: "COMMUNICATION OVERLOAD",
        message: "Your spacecraft is transmitting vectors too rapidly. Systems throttled for 60 seconds."
    },
    standardHeaders: true, 
    legacyHeaders: false, 
});

// Apply Rate Limiting globally across our gateway route layer
app.use(gatewayRateLimiter);

// LAYER B: AUTHENTICATION GATEWAY MIDDLEWARE (FIREBASE AUTH ID TOKEN EXAMINER)
async function gatewayAuthenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    // Check if the standard Authorization header is present
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            status: 401,
            error: "UNAUTHORIZED VESSEL",
            message: "Missing or malformed Authorization vector beacon."
        });
    }

    const idToken = authHeader.split("Bearer ")[1]; // Isolate raw encoded JWT payload

    try {
        // Cryptographically verify signature using Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Attach decoded identity directly to request parameter scope
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || "Unknown Pilot"
        };
        
        return next(); // Gateway verification confirmed -> Release to application logic layers
    } catch (error) {
        console.error("Gateway Auth Validation Failed:", error);
        return res.status(403).json({
            status: 403,
            error: "FORBIDDEN TELEMETRY",
            message: "Galactic identity signature has expired or is cryptographically invalid."
        });
    }
}

// LAYER C: SOCKET.IO HANDSHAKE CONNECTION INTERCEPTOR
io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token; 
    
    if (!token) {
        return next(new Error("Authentication engine missing telemetry token packet."));
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        socket.user = decodedToken; 
        return next(); 
    } catch (err) {
        return next(new Error("Handshake aborted: Invalid credential signature matrices."));
    }
});

// ==========================================
// 🛰️ UNIFIED SOCKET PIPELINE & ROUTING
// ==========================================

io.on("connection", (socket) => {
    console.log("Authenticated vessel docked: ", socket.id);

    socket.on("chatMessage", async (msg) => {
        console.log("Received message on server:", msg);
        // Broadcast the message to all OTHER connected clients immediately
        socket.broadcast.emit("message", msg);

        // Asynchronously save the message to your Firebase Cloud database
        try {
            await db.collection("messages").add({
                text: msg,
                timestamp: admin.firestore.FieldValue.serverTimestamp(), // Saves the exact cloud database time
                socketId: socket.id 
            });
            console.log("Message successfully saved to Firestore!");
        } catch (error) {
            console.error("Error writing to Firestore:", error);
        }
    });
});
     
// Serve all static files (like style.css) out of the public folder
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html when someone visits the main URL
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================
// 🚀 RUN COMPILER & LAUNCH IN ORBIT
// ==========================================
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => console.log(`Gateway Online. Core Server tracking on port ${PORT}`));