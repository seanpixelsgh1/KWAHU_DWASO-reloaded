import { NextResponse } from "next/server";
import { FORCE_PREMIUM } from "@/lib/constants/admin";
import { adminDb as db } from "@/lib/firebase/admin"; 
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";

const ADMIN_EMAIL = "seanpixelsgh1@gmail.com";

export async function POST(request: Request) {
  const session = await auth();
  const isDev = process.env.NODE_ENV === "development";

  // 1. HARDENED SECURITY GATE
  // Only allow if: It's YOU (via session) OR (Force Premium is on AND we are in Dev mode)
  const isAuthorized = 
    session?.user?.email?.toLowerCase() === ADMIN_EMAIL || 
    (FORCE_PREMIUM && isDev);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized access denied." }, { status: 403 });
  }

  try {
    // 2. PREVENT DUPLICATES
    const productCheck = await db.collection("products").limit(1).get();
    if (!productCheck.empty) {
      return NextResponse.json({ message: "Database already seeded. Clear records to re-seed." });
    }

    const batch = db.batch();

    // 3. SEED USERS & CAPTURE IDs
    const userRef1 = db.collection("users").doc();
    const userRef2 = db.collection("users").doc();

    batch.set(userRef1, { 
      name: "Kwame Mensah", 
      email: "kwame@kwahudwaso.com", 
      role: "user", 
      createdAt: FieldValue.serverTimestamp() 
    });
    
    batch.set(userRef2, { 
      name: "Ama Serwaa", 
      email: "ama@kwahudwaso.com", 
      role: "user", 
      createdAt: FieldValue.serverTimestamp() 
    });

    // 4. SEED PRODUCTS
    const sampleProducts = [
      { name: "Kwahu Tiger Nuts (1kg)", price: 25, stock: 100, category: "Agriculture", vendorId: "demo-vendor" },
      { name: "Local Honey (500ml)", price: 45, stock: 30, category: "Groceries", vendorId: "demo-vendor" },
      { name: "Nkawkaw Pottery Pot", price: 120, stock: 15, category: "Crafts", vendorId: "demo-vendor" }
    ];

    sampleProducts.forEach(product => {
      const pRef = db.collection("products").doc();
      batch.set(pRef, { ...product, createdAt: FieldValue.serverTimestamp() });
    });

    // 5. SEED ORDERS (Linked to User 1)
    const orderRef = db.collection("orders").doc();
    batch.set(orderRef, {
      total: 150,
      status: "pending",
      userId: userRef1.id, // Linking logic!
      items: 2,
      createdAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: "Kwahu Dwaso logic initialized!",
      summary: {
        users: 2,
        products: sampleProducts.length,
        orders: 1
      }
    });
  } catch (error) {
    console.error("Seeding Error:", error);
    return NextResponse.json({ error: "Seeding failed" }, { status: 500 });
  }
}
