import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase/admin";
import { auth } from "@/auth";
import { FORCE_PREMIUM } from "@/lib/constants/admin";

export async function POST(request: NextRequest) {
  try {
    // 1. HARDENED ADMIN AUTHORIZATION
    const session = await auth();
    const isDev = process.env.NODE_ENV === "development";
    
    // Strict Role Check - Require Admin OR God Mode Dev
    const isAuthorized = 
      session?.user?.role === "admin" || 
      (FORCE_PREMIUM && isDev);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden - Administrator access required" },
        { status: 403 }
      );
    }

    const userId = session?.user?.id || "admin";

    // 2. EXTRACT AND VALIDATE FILE
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validation: Image type and 2MB size limit
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image size exceeds 2MB limit" },
        { status: 400 }
      );
    }

    // 3. STORAGE LOGIC (Standardized Path)
    const timestamp = Date.now();
    // Use path: products/temp/{userId}/image-{timestamp}.jpg
    const fileName = `products/temp/${userId}/image-${timestamp}.jpg`;
    const fileRef = adminStorage.file(fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Save to storage with metadata
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // 4. MAKE PUBLIC AND RETURN METADATA
    await fileRef.makePublic();
    
    // Construct public URL
    const bucketName = adminStorage.name;
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: fileName, // Return path for atomic-safe metadata storage
    });

  } catch (error) {
    console.error("API ERROR [admin-products-upload-image]:", error);
    return NextResponse.json(
      { 
        error: "Failed to upload image",
        details: error instanceof Error ? error.message : "Internal Server Error"
      },
      { status: 500 }
    );
  }
}
