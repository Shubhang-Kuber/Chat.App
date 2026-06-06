const http = require("http");
const express = require("express");
const path = require("path"); // For absolute path resolution
const { Server } = require("socket.io");
const admin = require("firebase-admin"); // 1. Import Firebase Admin SDK

// 2. DYNAMICALLY LOAD CREDENTIALS FOR LOCAL VS CLOUD PRODUCTION
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
     
// Serve all static files (like style.css) out of the public folder
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html when someone visits the main URL
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 5. DYNAMIC PORT ALLOCATION FOR CLOUD DEPLOYMENT
// Render injects its own dynamic port variable, but we default to 9000 for your local machine
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));