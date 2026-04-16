import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function DELETE(request: NextRequest) {
  try {
    const { email, addressIndex } = await request.json();

    if (!email || addressIndex === undefined) {
      return NextResponse.json(
        { error: "Email and address index are required" },
        { status: 400 }
      );
    }

    const snapshot = await db.collection("users").where("email", "==", email).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData) {
      return NextResponse.json({ error: "User data is empty" }, { status: 404 });
    }

    let addresses = userData.profile?.addresses || [];

    // Remove address at specified index
    if (addressIndex >= 0 && addressIndex < addresses.length) {
      addresses.splice(addressIndex, 1);
    } else {
      return NextResponse.json(
        { error: "Invalid address index" },
        { status: 400 }
      );
    }

    await userDoc.ref.update({
      "profile.addresses": addresses,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, addresses });
  } catch (error) {
    console.error("API ERROR [delete-address]:", error);
    return NextResponse.json(
      {
        error: "Failed to delete address",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

