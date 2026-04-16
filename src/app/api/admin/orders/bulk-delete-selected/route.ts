import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function DELETE(request: NextRequest) {
  try {
    const { orderIds } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Order IDs array is required" },
        { status: 400 }
      );
    }

    const batch = db.batch();
    const results = {
      deleted: [] as string[],
      notFound: [] as string[],
      errors: [] as { orderId: string; error: string }[],
    };

    // 1. Mark standalone orders for deletion in batch
    for (const orderId of orderIds) {
      const orderRef = db.collection("orders").doc(orderId);
      batch.delete(orderRef);
      results.deleted.push(orderId); // Assume deleted if marked in batch
    }

    // 2. Remove orders from all users in a single pass
    const usersSnapshot = await db.collection("users").get();

    usersSnapshot.docs.forEach((userDocSnapshot) => {
      const userData = userDocSnapshot.exists ? userDocSnapshot.data() : null;
      if (userData?.orders && Array.isArray(userData.orders)) {
        const originalOrdersLength = userData.orders.length;
        const filteredOrders = userData.orders.filter(
          (order: any) => !orderIds.includes(order.id)
        );

        if (filteredOrders.length !== originalOrdersLength) {
          batch.update(userDocSnapshot.ref, {
            orders: filteredOrders,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    });

    // 3. Commit all changes at once
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Deleted ${results.deleted.length} selected orders successfully`,
      results,
    });
  } catch (error) {
    console.error("API ERROR [admin-orders-bulk-delete-selected]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

