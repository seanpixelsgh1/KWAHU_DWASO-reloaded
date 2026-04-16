import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// This is a development utility endpoint to set admin role
// In production, this should be secured or done through Firebase Admin Console
export async function POST(request: NextRequest) {
  try {
    const { email, secretKey } = await request.json();

    // Simple protection - in production use proper authentication
    if (secretKey !== "admin_setup_2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Update user role to admin using Admin SDK
    await adminDb.collection("users").doc(email).update({
      role: "admin",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: `User ${email} has been promoted to admin`,
      success: true,
    });
  } catch (error) {
    console.error("API ERROR [admin-setup]:", error);
    return NextResponse.json(
      { error: "Failed to set admin role" },
      { status: 500 }
    );
  }
}

