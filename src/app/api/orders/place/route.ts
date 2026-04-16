import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();
    const { customerEmail } = orderData;

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email required" },
        { status: 400 }
      );
    }

    // Find the user by email using Admin SDK
    const snapshot = await db.collection("users").where("email", "==", customerEmail).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDoc = snapshot.docs[0];

    // Generate a unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}`;

    // Create the order object
    const order = {
      id: orderId,
      orderId: orderId,
      ...orderData,
      createdAt: FieldValue.serverTimestamp(),
    };

    // Add the order to the user's orders array using Admin SDK
    await userDoc.ref.update({
      orders: FieldValue.arrayUnion(order),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: "Order placed successfully",
      success: true,
      orderId: orderId,
      order: order,
    });
  } catch (error) {
    console.error("API ERROR [orders-place]:", error);
    return NextResponse.json(
      { error: "Failed to place order" },
      { status: 500 }
    );
  }
}

