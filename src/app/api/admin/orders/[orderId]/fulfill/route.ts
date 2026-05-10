import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/auth/adminGuard";
import { sendOrderUpdate } from "@/lib/notifications/orderNotifications";

// ─────────────────────────────────────────────
// STRICT ORDER STATE MACHINE
// ─────────────────────────────────────────────
const ORDER_FLOW: Record<string, string[]> = {
  pending: ["processing"],
  processing: ["packed"],
  packed: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
};

const EVENT_MAP: Record<string, { event: string; message: string }> = {
  processing: { event: "order_processing", message: "Order marked as processing" },
  packed: { event: "order_packed", message: "Order packed and ready for dispatch" },
  out_for_delivery: { event: "order_dispatched", message: "Order handed to rider for delivery" },
  delivered: { event: "order_delivered", message: "Order delivered successfully" },
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // 1. ADMIN GUARD
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden — Admin access required" },
        { status: 403 }
      );
    }

    const { orderId } = await params;
    const body = await req.json();
    const { nextStatus, rider } = body;

    // 2. VALIDATE nextStatus
    if (!nextStatus || typeof nextStatus !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'nextStatus'" },
        { status: 400 }
      );
    }

    const validStatuses = ["processing", "packed", "out_for_delivery", "delivered"];
    if (!validStatuses.includes(nextStatus)) {
      return NextResponse.json(
        { error: `Invalid status: '${nextStatus}'. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // 3. FETCH ORDER
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderDoc.data()!;

    // 4. PAYMENT GUARD — cannot fulfill unpaid orders
    if (orderData.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Cannot fulfill an unpaid order" },
        { status: 400 }
      );
    }

    // 5. STATE MACHINE VALIDATION — reject invalid transitions
    const currentStatus = orderData.status;
    const allowedNext = ORDER_FLOW[currentStatus];

    if (!allowedNext) {
      return NextResponse.json(
        { error: `Current status '${currentStatus}' is not in the fulfillment pipeline` },
        { status: 400 }
      );
    }

    if (!allowedNext.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: `Invalid transition: '${currentStatus}' → '${nextStatus}'. Allowed: [${allowedNext.join(", ")}]`,
        },
        { status: 400 }
      );
    }

    // 6. RIDER VALIDATION — required for dispatch
    if (nextStatus === "out_for_delivery") {
      if (!rider || !rider.name || !rider.phone) {
        return NextResponse.json(
          { error: "Rider name and phone are required for dispatch" },
          { status: 400 }
        );
      }
    }

    // 7. BUILD UPDATE PAYLOAD
    const updatePayload: Record<string, any> = {
      status: nextStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (nextStatus === "packed") {
      updatePayload.packedAt = FieldValue.serverTimestamp();
    }

    if (nextStatus === "out_for_delivery") {
      updatePayload.rider = {
        name: rider.name,
        phone: rider.phone,
      };
      updatePayload.dispatchedAt = FieldValue.serverTimestamp();
    }

    if (nextStatus === "delivered") {
      updatePayload.deliveredAt = FieldValue.serverTimestamp();
    }

    // 8. ATOMIC UPDATE + LOG
    const eventInfo = EVENT_MAP[nextStatus];
    const logRef = orderRef.collection("logs").doc();

    const batch = db.batch();

    batch.update(orderRef, updatePayload);

    batch.set(logRef, {
      event: eventInfo.event,
      message: eventInfo.message,
      actor: admin.userId,
      level: "info",
      metadata: {
        previousStatus: currentStatus,
        newStatus: nextStatus,
        ...(rider ? { rider } : {}),
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // 9. FIRE NOTIFICATION HOOK (non-blocking)
    sendOrderUpdate(
      {
        orderId,
        email: orderData.email || orderData.customerEmail,
        rider: rider || undefined,
      },
      nextStatus
    ).catch((err) => console.error("Notification hook failed:", err));

    return NextResponse.json({
      success: true,
      message: `Order transitioned to '${nextStatus}'`,
      orderId,
      previousStatus: currentStatus,
      newStatus: nextStatus,
    });
  } catch (error: any) {
    console.error("FULFILL API ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
