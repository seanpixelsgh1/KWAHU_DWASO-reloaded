import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const cursorId = url.searchParams.get("cursor");
    const statusFilter = url.searchParams.get("status");
    const paymentStatusFilter = url.searchParams.get("paymentStatus");
    const searchParam = url.searchParams.get("search");

    let query: any = db.collection("orders");

    if (statusFilter && statusFilter !== "all") {
      query = query.where("status", "==", statusFilter);
    }

    if (paymentStatusFilter && paymentStatusFilter !== "all") {
      query = query.where("paymentStatus", "==", paymentStatusFilter);
    }

    if (searchParam) {
      // Due to Firestore limitations (inequality filters require orderBy on the same field),
      // we implement exact match for server-side email search.
      query = query.where("email", "==", searchParam);
    }

    query = query.orderBy("createdAt", "desc").limit(20);

    if (cursorId) {
      const cursorDoc = await db.collection("orders").doc(cursorId).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const ordersSnapshot = await query.get();

    const orders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      
      // Handle timestamp conversion safely
      let createdAtIso = new Date().toISOString();
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === "function") {
          createdAtIso = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === "string" || typeof data.createdAt === "number") {
          const parsedDate = new Date(data.createdAt);
          if (!isNaN(parsedDate.getTime())) {
            createdAtIso = parsedDate.toISOString();
          }
        }
      }

      // Normalize paymentStatus ("pending" | "paid" | "failed")
      let paymentStatus = "pending";
      const rawPayment = data.paymentStatus?.toLowerCase();
      if (["paid", "failed"].includes(rawPayment)) {
        paymentStatus = rawPayment;
      } else if (rawPayment === "success") {
        paymentStatus = "paid"; // Map legacy "success" to "paid"
      }

      // Normalize status ("pending" | "processing" | "delivered")
      let status = "pending";
      const rawStatus = data.status?.toLowerCase();
      if (["processing", "delivered"].includes(rawStatus)) {
        status = rawStatus;
      } else if (rawStatus === "completed") {
        status = "delivered"; // Map legacy "completed" to "delivered"
      }

      // Normalize paymentMethod ("paystack" | "cod")
      const paymentMethod = data.paymentMethod?.toLowerCase() === "cod" ? "cod" : "paystack";

      return {
        id: doc.id,
        email: data.email || "N/A",
        amount: typeof data.amount === "number" ? data.amount : 0,
        currency: "GHS", // Enforced
        paymentStatus,
        status,
        paymentMethod,
        createdAt: createdAtIso,
      };
    });

    const lastVisibleDoc = ordersSnapshot.docs[ordersSnapshot.docs.length - 1];
    const nextCursor = lastVisibleDoc ? lastVisibleDoc.id : null;

    return NextResponse.json(
      {
        success: true,
        orders,
        nextCursor,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API ERROR [admin-orders-get]:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
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

