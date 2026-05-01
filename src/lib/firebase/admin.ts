import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.FIREBASE_PROJECT_ID;

const bucketName =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  `${projectId}.appspot.com`;

if (!process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error("Missing Firebase Admin environment variables");
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ?.replace(/^"|"$/g, '') // remove accidental quotes
  ?.replace(/\\n/g, '\n'); // restore line breaks

// Initialize Firebase Admin
const adminApp =
  getApps().find((app) => app.name === "admin") ||
  initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      storageBucket: bucketName,
    },
    "admin"
  );

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export const adminStorage = getStorage(adminApp).bucket();
export default adminApp;

console.log("🔥 Firebase Admin Bucket:", bucketName);
