require("dotenv").config();
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

async function test() {
  try {
    console.log("Initializing...");
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    console.log("Private key starts with:", privateKey ? privateKey.substring(0, 30) : "undefined");
    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("App initialized");
    const db = getFirestore(app);
    console.log("Fetching orders...");
    const snapshot = await db.collection("orders").limit(1).get();
    console.log("Success! Found", snapshot.size, "orders");
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
