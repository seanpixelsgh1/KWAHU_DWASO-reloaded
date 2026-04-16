import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminDb as db } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Use email or id, checking session.user for both
    const userIdOrEmail = session?.user?.id || session?.user?.email;

    if (!userIdOrEmail) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's orders from their subcollection using Admin SDK
    const ordersSnapshot = await db
      .collection("users")
      .doc(userIdOrEmail)
      .collection("orders")
      .orderBy("createdAt", "desc")
      .get();

    const orders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt:
          data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : 
          (data?.createdAt || new Date().toISOString()),
        updatedAt:
          data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : 
          (data?.updatedAt || new Date().toISOString()),
      };
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("API ERROR [user-orders-get]:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

