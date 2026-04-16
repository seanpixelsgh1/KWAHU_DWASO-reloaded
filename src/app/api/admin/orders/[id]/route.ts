import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { userId, updates } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // Try to update order in orders collection first using Admin SDK
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (orderDoc.exists) {
      await orderRef.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({
        success: true,
        updated: "orders_collection",
        orderId,
      });
    }

    // If userId provided, update the order in user's orders array using Admin SDK
    if (userId) {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const orders = userData?.orders || [];

        const orderIndex = orders.findIndex(
          (order: any) => order.id === orderId
        );
        if (orderIndex !== -1) {
          orders[orderIndex] = {
            ...orders[orderIndex],
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
          };

          await userRef.update({ orders });
          return NextResponse.json({
            success: true,
            updated: "user_orders",
            orderId,
          });
        }
      }
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error) {
    console.error("API ERROR [admin-order-put]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    let deleted = false;
    const deletedFrom: string[] = [];

    // Try to delete from orders collection first using Admin SDK
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (orderDoc.exists) {
      await orderRef.delete();
      deleted = true;
      deletedFrom.push("orders_collection");
    }

    // Search through all users and remove the order from any user's orders array using Admin SDK
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.orders && Array.isArray(userData.orders)) {
        const originalOrdersLength = userData.orders.length;
        const filteredOrders = userData.orders.filter(
          (order: any) => order.id !== orderId
        );

        // If order was found and removed
        if (filteredOrders.length !== originalOrdersLength) {
          await userDoc.ref.update({
            orders: filteredOrders,
            updatedAt: FieldValue.serverTimestamp(),
          });
          deleted = true;
          deletedFrom.push(`user_orders:${userDoc.id}`);
        }
      }
    }

    if (!deleted) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
      orderId,
      deletedFrom,
    });
  } catch (error) {
    console.error("API ERROR [admin-order-delete]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // Try to get order from orders collection first using Admin SDK
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (orderDoc.exists) {
      return NextResponse.json({
        order: { id: orderDoc.id, ...orderDoc.data() },
        source: "orders_collection",
      });
    }

    // Search in all users' orders using Admin SDK
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.orders && Array.isArray(userData.orders)) {
        const foundOrder = userData.orders.find(
          (order: any) => order.id === orderId
        );
        if (foundOrder) {
          return NextResponse.json({
            order: foundOrder,
            userId: userDoc.id,
            customerName: userData.name || userData.displayName,
            customerEmail: userData.email,
            source: "user_orders",
          });
        }
      }
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error) {
    console.error("API ERROR [admin-order-get]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

