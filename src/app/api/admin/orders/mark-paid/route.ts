import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { auth } from "@/auth";
import { FORCE_PREMIUM } from "@/lib/constants/admin";
import { confirmInventory } from "@/lib/inventory";

export async function PUT(request: NextRequest) {
  try {
    // ── 1. AUTHENTICATION & ROLE VALIDATION ──
    const session = await auth();
    const isDev = process.env.NODE_ENV === "development";
    const isAuthorized = session?.user?.role === "admin" || (FORCE_PREMIUM && isDev);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Forbidden — Administrator access required" },
        { status: 403 }
      );
    }

    // ── 2. INPUT VALIDATION ──
    const body = await request.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing orderId" },
        { status: 400 }
      );
    }

    // ── 3. PRE-TRANSACTION VALIDATIONS ──
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

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
      meta: { source: "manual_override", initiatedBy: session?.user?.email || "admin" }
    };

    const extraUpdates = {
      paymentOverride: true
    };

    await confirmInventory(orderRef, { source: "manual_override" }, logPayload, extraUpdates);

    return NextResponse.json({ success: true, message: "Order successfully marked as paid" });

  } catch (error: any) {
    console.error("API ERROR [admin-orders-mark-paid]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
