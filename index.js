const http = require("http");
const express = require("express");
const path = require("path"); // For absolute path resolution
const { Server } = require("socket.io");
const admin = require("firebase-admin"); // 1. Import Firebase Admin SDK

// 2. Load your downloaded Firebase credentials file
const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // 3. Create a reference to your Cloud Firestore database

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Socket.io connection handling
io.on("connection", (socket) => {
    console.log("A user connected: ", socket.id);

    socket.on("chatMessage", async (msg) => {
        console.log("Received message on server:", msg);
        // Broadcast the message to all OTHER connected clients immediately
        socket.broadcast.emit("message", msg);

        // 4. Asynchronously save the message to your Firebase Cloud database
        try {
            await db.collection("messages").add({
                text: msg,
                timestamp: admin.firestore.FieldValue.serverTimestamp(), // Saves the exact cloud database time
                socketId: socket.id // Optional: Helps you track who sent what session-wise
            });
            console.log("Message successfully saved to Firestore!");
        } catch (error) {
            console.error("Error writing to Firestore:", error);
        }
    });
});
     
app.use(express.static(path.resolve("./public")));

// FIXING THE PATH BUG:
// Your original code used: res.sendFile("/public/index.html")
// This causes errors on Windows because of absolute vs relative root pathing.
// Using path.join with __dirname fixes this perfectly across all Operating Systems.
app.get("/", (req, res) => {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
});

server.listen(9000, () => console.log("Server is running on port 9000"));
