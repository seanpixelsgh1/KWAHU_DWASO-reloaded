import * as admin from "firebase-admin";

if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  console.error("Missing Firebase Admin credentials in environment variables");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

async function initSettings() {
  console.log("Initializing default settings...");
  
  const docRef = db.collection("settings").doc("global");
  const doc = await docRef.get();

  if (doc.exists) {
    console.log("Settings already initialized. Run with force to overwrite (not implemented).");
    process.exit(0);
  }

  const defaultSettings = {
    currency: "GHS",
    store: {
      name: "Kwahu Dwaso",
      email: "support@kwahudwaso.com",
      phone: "+233240000000"
    },
    inventory: { 
      lowStockThreshold: 5 
    },
    features: {
      enableReviews: false,
      enableWishlist: true,
      enableCoupons: false
    },
    email: {
      provider: "console",
      fromEmail: "no-reply@kwahudwaso.com"
    },
    paystack: {
      publicKey: "pk_test_placeholder" // To be updated in admin UI
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await docRef.set(defaultSettings);
  console.log("Successfully initialized default settings!");
  process.exit(0);
}

initSettings().catch(console.error);
