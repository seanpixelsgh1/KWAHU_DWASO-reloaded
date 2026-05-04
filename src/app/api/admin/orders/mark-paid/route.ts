import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/auth/adminGuard";
import { confirmInventory } from "@/lib/inventory";
import { withTimeout } from "@/lib/utils/withTimeout";

export async function PUT(request: NextRequest) {
  try {
    // ── 1. AUTHENTICATION & ROLE VALIDATION ──
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden — Administrator access required" },
        { status: 403 }
      );
    }
    const adminId = admin.email;
      );
    }

    // ── 2. INPUT VALIDATION ──
    const body = await request.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid orderId" },
        { status: 400 }
      );
    }

    // ── 3. PRE-TRANSACTION VALIDATIONS ──
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await withTimeout(orderRef.get());

    if (!orderDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data() || {};

    // Hard block
    if (orderData.status === "delivered") {
      return NextResponse.json(
        { success: false, error: "Cannot override a delivered order" },
        { status: 400 }
      );
    }

    // Idempotency: Prevent double processing
    if (orderData.paymentStatus === "paid") {
      return NextResponse.json({ success: true, message: "Order is already paid" });
    }

    // ── 4. ATOMIC UPDATE VIA INVENTORY HOOK ──
    // The confirmInventory hook executes a transaction that deducts stock,
    // updates the order, and writes the log.
    
    const logPayload = {
      event: "payment_manual_override",
      message: "Admin manually marked payment as paid",
      actor: "admin",
      level: "warning",
      meta: { source: "manual_override", initiatedBy: adminId }
    };

    const extraUpdates = {
      paymentOverride: {
        by: adminId,
        at: FieldValue.serverTimestamp(),
        reason: "manual override"
      }
    };

    await confirmInventory(orderRef, { source: "manual_override" }, logPayload, extraUpdates);

    return NextResponse.json({ success: true, message: "Order successfully marked as paid" });

  } catch (error: any) {
    console.error("API_MARK_PAID_ERROR", {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
