import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    // Fetch all users with their orders using Admin SDK
    const usersSnapshot = await db.collection("users").get();

    const users = usersSnapshot.docs.map((doc) => {
      const userData = doc.exists ? doc.data() : {};
      return {
        id: doc.id,
        name: userData.name || userData.displayName || "Unknown User",
        email: userData.email || "",
        role: userData.role || "user",
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : 
                  (userData.createdAt || new Date().toISOString()),
        orders: userData.orders || [],
      };
    });

    // Sort users by creation date
    users.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Also fetch orders from the orders collection using Admin SDK
    const ordersSnapshot = await db.collection("orders").get();
    const standaloneOrders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : 
                  (data?.createdAt || new Date().toISOString()),
        updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : 
                  (data?.updatedAt || new Date().toISOString()),
      };
    });

    return NextResponse.json(
      {
        users,
        standaloneOrders,
        totalUsers: users.length,
        totalOrders:
          users.reduce((sum, user) => sum + (user.orders?.length || 0), 0) +
          standaloneOrders.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API ERROR [admin-orders-get]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, userId, updates, status, paymentStatus } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // Build updates object from individual fields or use provided updates
    const updateFields = updates || {};
    if (status) updateFields.status = status;
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;

    // If orderId exists in orders collection, update it there using Admin SDK
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (orderDoc.exists) {
      await orderRef.update({
        ...updateFields,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({
        success: true,
        updated: "orders_collection",
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
            ...updateFields,
            updatedAt: FieldValue.serverTimestamp(),
          };

          await userRef.update({ orders });
          return NextResponse.json({ success: true, updated: "user_orders" });
        }
      }
    }

    // If no userId provided or not found, search all users for the order using Admin SDK
    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const orders = userData?.orders || [];

      const orderIndex = orders.findIndex((order: any) => order.id === orderId);
      if (orderIndex !== -1) {
        orders[orderIndex] = {
          ...orders[orderIndex],
          ...updateFields,
          updatedAt: FieldValue.serverTimestamp(),
        };

        await userDoc.ref.update({ orders });
        return NextResponse.json({ success: true, updated: "user_orders" });
      }
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error) {
    console.error("API ERROR [admin-orders-put]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { orderId, userId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 });
    }

    // Try to delete from orders collection first using Admin SDK
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (orderDoc.exists) {
      await orderRef.delete();
      return NextResponse.json({
        success: true,
        deleted: "orders_collection",
      });
    }

    // If userId provided, remove the order from user's orders array using Admin SDK
    if (userId) {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const orders = userData?.orders || [];

        const filteredOrders = orders.filter(
          (order: any) => order.id !== orderId
        );

        if (filteredOrders.length !== orders.length) {
          await userRef.update({ orders: filteredOrders });
          return NextResponse.json({ success: true, deleted: "user_orders" });
        }
      }
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error) {
    console.error("API ERROR [admin-orders-delete]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

