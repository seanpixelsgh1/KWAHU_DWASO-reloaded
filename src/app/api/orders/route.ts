import { NextRequest, NextResponse } from "next/server";

import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  getVisibleOrderStatuses,
  canUpdateOrderStatus,
  canUpdatePaymentStatus,
  isValidStatusTransition,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from "@/lib/orderStatus";
import { hasPermission } from "@/lib/rbac/permissions";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";

// GET - Fetch orders based on user role
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role using Admin SDK
    const userDoc = await db.collection("users").doc(session.user.email).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const userRole = userData?.role || "user";

    // Check if user has permission to view orders
    if (!hasPermission(userRole, "orders", "read")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const visibleStatuses = getVisibleOrderStatuses(userRole);
    if (visibleStatuses.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // Build query based on role using Admin SDK
    let ordersQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection("orders");

    if (userRole === "admin" || userRole === "account") {
      // Admin and accountant can see all orders
      ordersQuery = ordersQuery.orderBy("createdAt", "desc");
    } else {
      // Role-based filtering
      ordersQuery = ordersQuery
        .where("status", "in", visibleStatuses)
        .orderBy("createdAt", "desc");
    }

    const ordersSnapshot = await ordersQuery.get();
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

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("API ERROR [orders-get]:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// PUT - Update order status
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, status, paymentStatus, deliveryNotes } =
      await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get user role using Admin SDK
    const userDoc = await db.collection("users").doc(session.user.email).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const userRole = userData?.role || "user";

    // Check if user has permission to update orders
    if (!hasPermission(userRole, "orders", "update")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get current order using Admin SDK
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentOrder = orderDoc.data();
    if (!currentOrder) {
      return NextResponse.json({ error: "Order data is empty" }, { status: 404 });
    }

    const currentStatus = currentOrder.status as OrderStatus;
    const currentPaymentStatus = currentOrder.paymentStatus as PaymentStatus;
    const paymentMethod = currentOrder.paymentMethod as PaymentMethod;

    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.user.email,
    };

    // Handle order status update
    if (status && status !== currentStatus) {
      // Validate status transition
      if (!isValidStatusTransition(currentStatus, status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${currentStatus} to ${status}`,
          },
          { status: 400 }
        );
      }

      // Check role permissions for status update
      if (!canUpdateOrderStatus(userRole, currentStatus, status)) {
        return NextResponse.json(
          {
            error: `You don't have permission to change status from ${currentStatus} to ${status}`,
          },
          { status: 403 }
        );
      }

      updateData.status = status;

      // Add status history
      const statusHistory = currentOrder.statusHistory || [];
      statusHistory.push({
        status,
        timestamp: FieldValue.serverTimestamp(),
        updatedBy: session.user.email,
        userRole,
        notes: deliveryNotes || `Status changed to ${status}`,
      });
      updateData.statusHistory = statusHistory;
    }

    // Handle payment status update
    if (paymentStatus && paymentStatus !== currentPaymentStatus) {
      // Check role permissions for payment status update
      if (
        !canUpdatePaymentStatus(
          userRole,
          paymentMethod,
          currentPaymentStatus,
          paymentStatus
        )
      ) {
        return NextResponse.json(
          {
            error: `You don't have permission to update payment status for ${paymentMethod} payments`,
          },
          { status: 403 }
        );
      }

      updateData.paymentStatus = paymentStatus;

      // Add payment history
      const paymentHistory = currentOrder.paymentHistory || [];
      paymentHistory.push({
        status: paymentStatus,
        timestamp: FieldValue.serverTimestamp(),
        updatedBy: session.user.email,
        userRole,
        method: paymentMethod,
        notes: deliveryNotes || `Payment status changed to ${paymentStatus}`,
      });
      updateData.paymentHistory = paymentHistory;
    }

    // Add delivery notes if provided
    if (deliveryNotes) {
      const notes = currentOrder.deliveryNotes || [];
      notes.push({
        note: deliveryNotes,
        timestamp: FieldValue.serverTimestamp(),
        addedBy: session.user.email,
        userRole,
      });
      updateData.deliveryNotes = notes;
    }

    // Update the order
    await orderRef.update(updateData);

    // Also update user's order subcollection if it exists
    try {
      if (currentOrder.userEmail) {
        const userOrderRef = db
          .collection("users")
          .doc(currentOrder.userEmail)
          .collection("orders")
          .doc(orderId);
        
        // Use a check to see if it exists before updating or use merge set
        const userOrderDoc = await userOrderRef.get();
        if (userOrderDoc.exists) {
          await userOrderRef.update(updateData);
        }
      }
    } catch (error) {
      console.log("User order subcollection update failed or not found, skipping");
    }

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      orderId,
      updates: updateData,
    });
  } catch (error) {
    console.error("API ERROR [orders-put]:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

// POST - Create new order (from checkout)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderData = await request.json();

    // Create order with initial status
    const newOrder = {
      ...orderData,
      status: ORDER_STATUSES.PENDING,
      paymentStatus:
        orderData.paymentMethod === PAYMENT_METHODS.CASH
          ? PAYMENT_STATUSES.PENDING
          : PAYMENT_STATUSES.PAID,
      userEmail: session.user.email,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      statusHistory: [
        {
          status: ORDER_STATUSES.PENDING,
          timestamp: FieldValue.serverTimestamp(),
          updatedBy: session.user.email,
          userRole: "user",
          notes: "Order placed",
        },
      ],
      paymentHistory: [
        {
          status:
            orderData.paymentMethod === PAYMENT_METHODS.CASH
              ? PAYMENT_STATUSES.PENDING
              : PAYMENT_STATUSES.PAID,
          timestamp: FieldValue.serverTimestamp(),
          updatedBy: session.user.email,
          userRole: "user",
          method: orderData.paymentMethod || PAYMENT_METHODS.ONLINE,
          notes: `Order created with ${
            orderData.paymentMethod || "online"
          } payment`,
        },
      ],
    };

    // Add to orders collection using Admin SDK
    const orderRef = db.collection("orders").doc();
    await orderRef.set(newOrder);

    // Add to user's orders subcollection using Admin SDK
    const userOrderRef = db
      .collection("users")
      .doc(session.user.email)
      .collection("orders")
      .doc(orderRef.id);
    await userOrderRef.set(newOrder);

    return NextResponse.json({
      success: true,
      orderId: orderRef.id,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("API ERROR [orders-post]:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

