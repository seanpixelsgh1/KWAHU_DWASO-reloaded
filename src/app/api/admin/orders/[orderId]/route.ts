import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    
    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const data = orderDoc.data() || {};

    // Fetch logs subcollection
    const logsSnapshot = await orderRef.collection("logs").orderBy("createdAt", "desc").get();
    const logs = logsSnapshot.docs.map(doc => {
      const logData = doc.data();
      let logCreatedAt = new Date().toISOString();
      if (logData.createdAt) {
         if (typeof logData.createdAt.toDate === "function") {
           logCreatedAt = logData.createdAt.toDate().toISOString();
         } else {
           const d = new Date(logData.createdAt);
           if (!isNaN(d.getTime())) logCreatedAt = d.toISOString();
         }
      }
      return {
        id: doc.id,
        event: logData.event || "unknown_event",
        message: logData.message || "",
        level: logData.level || "info",
        actor: logData.actor || "system",
        createdAt: logCreatedAt,
        meta: logData.meta || null
      };
    });

    // Normalize Timestamps
    let createdAtIso = new Date().toISOString();
    if (data.createdAt) {
      if (typeof data.createdAt.toDate === "function") {
        createdAtIso = data.createdAt.toDate().toISOString();
      } else {
        const d = new Date(data.createdAt);
        if (!isNaN(d.getTime())) createdAtIso = d.toISOString();
      }
    }

    // Normalize Statuses
    let status = "pending";
    if (["pending", "processing", "delivered", "cancelled"].includes(data.status?.toLowerCase())) {
      status = data.status.toLowerCase();
    } else if (data.status?.toLowerCase() === "completed") {
      status = "delivered";
    }

    let paymentStatus = "pending";
    if (["pending", "paid", "failed"].includes(data.paymentStatus?.toLowerCase())) {
      paymentStatus = data.paymentStatus.toLowerCase();
    } else if (data.paymentStatus?.toLowerCase() === "success") {
      paymentStatus = "paid";
    }

    let paymentMethod = "paystack";
    if (data.paymentMethod?.toLowerCase() === "cod") {
      paymentMethod = "cod";
    }

    // Enforce Currency Consistency
    const amount = typeof data.amount === "number" ? Math.floor(data.amount) : 0;
    const currency = "GHS";

    // Normalize Items
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const items = rawItems.map(item => {
      const quantity = typeof item.quantity === "number" ? item.quantity : 1;
      const price = typeof item.price === "number" ? item.price : 0;
      return {
        name: typeof item.name === "string" ? item.name : "Unknown Item",
        quantity,
        price,
        total: typeof item.total === "number" ? item.total : quantity * price
      };
    });

    // Defensive Fallbacks
    const email = data.email || "N/A";
    const paymentReference = data.paymentReference || data.reference || data.trxref || null;
    const shippingAddress = typeof data.shippingAddress === "object" && data.shippingAddress !== null 
      ? data.shippingAddress 
      : {};

    // Compute Explicit System Flags
    const hasPaymentVerifiedLog = logs.some(l => l.event === "payment_verified");
    const flags = {
      paymentVerified: paymentStatus === "paid" || hasPaymentVerifiedLog,
      inventoryReserved: status !== "cancelled" && status !== "failed",
      inventoryConfirmed: status === "delivered" || status === "processing",
    };

    const order = {
      id: orderDoc.id,
      email,
      amount,
      currency,
      status,
      paymentStatus,
      paymentMethod,
      createdAt: createdAtIso,
      items,
      shippingAddress,
      paymentReference,
      flags,
      logs
    };

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("API ERROR [admin-orders-id-get]:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
