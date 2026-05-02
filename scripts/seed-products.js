const admin = require("firebase-admin");
const path = require("path");

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

async function seedProducts() {
  console.log("Fetching products from DummyJSON...");
  const response = await fetch("https://dummyjson.com/products?limit=0");
  const data = await response.json();
  const products = data.products;

  console.log(`Found ${products.length} products to migrate.`);

  const batchSize = 100;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = db.batch();
    const chunk = products.slice(i, i + batchSize);

    chunk.forEach((p) => {
      // Use string IDs for Firestore documents to maintain predictability 
      // or let Firestore generate them. Here we use the dummyjson ID.
      const docRef = db.collection("products").doc(p.id.toString());
      
      const productDoc = {
        name: p.title,
        description: p.description,
        // Convert floating point price to integer pesewas
        price: Math.round(p.price * 100),
        discountPercentage: p.discountPercentage,
        stock: p.stock,
        brand: p.brand || "",
        category: p.category,
        images: p.images,
        isActive: true,
        reserved: 0,
        createdAt: new Date().toISOString(),
      };
      
      batch.set(docRef, productDoc);
    });

    console.log(`Committing batch ${i / batchSize + 1}...`);
    await batch.commit();
  }

  console.log("Successfully seeded all products into Firestore!");
  process.exit(0);
}

seedProducts().catch(console.error);
