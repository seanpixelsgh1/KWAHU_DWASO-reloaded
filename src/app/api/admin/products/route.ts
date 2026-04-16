import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";
import { FORCE_PREMIUM } from "@/lib/constants/admin";

export async function POST(request: NextRequest) {
  try {
    // 1. HARDENED ADMIN AUTHORIZATION
    const session = await auth();
    const isDev = process.env.NODE_ENV === "development";
    
    // Check if user is admin OR if in dev mode with FORCE_PREMIUM
    const isAuthorized = 
      session?.user?.role === "admin" || 
      (FORCE_PREMIUM && isDev);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden - Administrator access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      price, 
      stock, 
      category, 
      images, 
      imageSource,
      imagePath // Add imagePath support
    } = body;

    // 2. CRITICAL VALIDATION
    
    // Basic required fields
    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and Category are required fields" },
        { status: 400 }
      );
    }

    // Strict Price Validation (Numeric Integrity)
    const numericPrice = Number(price);
    if (!price || isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json(
        { error: "A valid positive price is required" },
        { status: 400 }
      );
    }

    // Image Source Validation
    if (!imageSource || !["upload", "url"].includes(imageSource)) {
      return NextResponse.json(
        { error: "Invalid imageSource. Must be 'upload' or 'url'." },
        { status: 400 }
      );
    }

    // Strict Image Format Validation (Array + URLs)
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    const validImages = images.every(
      (img) => typeof img === "string" && img.startsWith("http")
    );

    if (!validImages) {
      return NextResponse.json(
        { error: "All images must be valid HTTP(S) strings" },
        { status: 400 }
      );
    }

    // 3. SAFE DEFAULTS AND DATA NORMALIZATION
    const productData = {
      name: name.trim(),
      description: (description || "").trim(),
      price: numericPrice,
      stock: Number(stock) || 0,
      category: category.trim(),
      images: images, 
      imageSource: imageSource,
      imagePath: imagePath || null, // Store imagePath if provided
      vendorId: session?.user?.id || "admin",
      isActive: true, 
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      sku: body.sku || `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };


    // 4. DATABASE WRITE
    const docRef = await db.collection("products").add(productData);

    return NextResponse.json({
      success: true,
      message: "Product created successfully",
      productId: docRef.id,
      product: {
        id: docRef.id,
        ...productData,
        // Format timestamps for immediate UI use if needed 
        // (though in reality serverTimestamp resolve on server)
        createdAt: new Date().toISOString(), 
      }
    }, { status: 201 });

  } catch (error) {
    console.error("API ERROR [admin-products-post]:", error);
    return NextResponse.json(
      { 
        error: "Failed to create product",
        details: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    );
  }
}

// GET method for admin to list products (Optional but helpful)
export async function GET() {
  try {
    const session = await auth();
    const isDev = process.env.NODE_ENV === "development";
    
    const isAuthorized = 
      session?.user?.role === "admin" || 
      (FORCE_PREMIUM && isDev);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const snapshot = await db.collection("products")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error("API ERROR [admin-products-get]:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
