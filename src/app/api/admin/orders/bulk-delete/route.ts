import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function DELETE(request: NextRequest) {
  try {
    const { orderIds } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Order IDs array required" },
        { status: 400 }
      );
    }

    // Use batch delete for better performance using Admin SDK
    const batch = db.batch();

    // Delete orders from the orders collection
    for (const orderId of orderIds) {
      const orderRef = db.collection("orders").doc(orderId);
      batch.delete(orderRef);
    }

    // Also need to remove these orders from user documents using Admin SDK
    const usersSnapshot = await db.collection("users").get();

    usersSnapshot.docs.forEach((userDocSnapshot) => {
      const userData = userDocSnapshot.exists ? userDocSnapshot.data() : null;
      if (userData?.orders && Array.isArray(userData.orders)) {
        const filteredOrders = userData.orders.filter(
          (order: any) => !orderIds.includes(order.id)
        );

        if (filteredOrders.length !== userData.orders.length) {
          // This user had some of the deleted orders
          batch.update(userDocSnapshot.ref, { 
            orders: filteredOrders,
            updatedAt: FieldValue.serverTimestamp()
          });
        }
      }
    });

    // Commit the batch
    await batch.commit();

    return NextResponse.json({
      success: true,
      deletedCount: orderIds.length,
    });
  } catch (error) {
    console.error("API ERROR [admin-orders-bulk-delete]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

