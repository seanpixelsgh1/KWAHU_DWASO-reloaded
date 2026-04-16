
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const dotenv = require('dotenv');

dotenv.config();

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
};

const adminApp = getApps().length === 0 ? initializeApp(firebaseAdminConfig, "admin_diag") : getApps()[0];
const storage = getStorage(adminApp);

async function checkBuckets() {
  try {
    const [buckets] = await storage.getBuckets();
    console.log('Available Buckets:');
    buckets.forEach(b => console.log(' -', b.name));
  } catch (err) {
    console.error('Failed to list buckets:', err.message);
  }
}

checkBuckets();
