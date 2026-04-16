import { NextRequest, NextResponse } from "next/server";
import { adminStorage, adminDb } from "@/lib/firebase/admin";
import { auth } from "@/auth";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate Session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    // 2. Extract and Validate File
    const formData = await request.formData();
    const file = formData.get("image") as File;
    const type = formData.get("type") as string; // "profile" | "product"

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

    // 3. STORAGE PATH AND CLEANUP LOGIC
    const timestamp = Date.now();
    let fileName = "";
    const isProfile = type === "profile";
    const isProduct = type === "product";

    if (isProduct) {
      fileName = `products/temp/${userId}/image-${timestamp}.jpg`;
    } else {
      // Default to profile for backward compatibility
      fileName = `profiles/${userId}/avatar-${timestamp}.jpg`;
    }

    // Only cleanup old files if it's a profile update
    if (isProfile || !type) {
      try {
        const [files] = await adminStorage.getFiles({ prefix: `profiles/${userId}/` });
        if (files.length > 0) {
          await Promise.all(files.map(f => f.delete()));
        }
      } catch (cleanupError) {
        console.warn("API WARNING [upload-image-cleanup]:", cleanupError);
      }
    }

    // 4. UPLOAD LOGIC
    const fileRef = adminStorage.file(fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    
    console.log(`[upload-image] Saving file to ${fileName}...`);
    try {
      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            uploadedBy: userId,
          }
        },
      });
      console.log(`[upload-image] File saved successfully.`);
    } catch (saveError: any) {
      console.error(`[upload-image] Save failed:`, saveError);
      throw new Error(`Failed to save to storage: ${saveError.message}`);
    }

    // 5. MAKE PUBLIC AND CONSTRUCT URL
    let finalImageUrl = "";
    try {
      console.log(`[upload-image] Attempting to make public...`);
      await fileRef.makePublic();
      const bucketName = adminStorage.name;
      finalImageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}?t=${timestamp}`;
      console.log(`[upload-image] Public URL: ${finalImageUrl}`);
    } catch (publicError: any) {
      console.warn(`[upload-image] makePublic failed. Using internal signed URL fallback.`, publicError);
      // Fallback: Generate a signed URL that lasts for a long time (10 years)
      const [signedUrl] = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Far future
      });
      finalImageUrl = signedUrl;
      console.log(`[upload-image] Signed URL: ${finalImageUrl}`);
    }

    // 6. UPDATE FIRESTORE (Profile Only)
    if (isProfile || !type) {
      console.log(`[upload-image] Updating Firestore user ${userId}...`);
      await adminDb.collection("users").doc(userId).update({
        image: finalImageUrl,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      path: fileName,
      type: type || "profile"
    });
  } catch (error: any) {
    console.error("API ERROR [upload-image]:", error);
    return NextResponse.json(
      {
        error: "Failed to upload image",
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}



