import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/auth/adminGuard";

/**
 * POST /api/admin/payments/backfill
 * 
 * One-time backfill: Creates payment documents for existing paid orders
 * that were processed before the payments collection was introduced.
 * 
 * Idempotent — will not create duplicates.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 1. Fetch all orders where paymentStatus === "paid"
    const ordersSnap = await db.collection("orders")
      .where("paymentStatus", "==", "paid")
      .get();

    if (ordersSnap.empty) {
      return NextResponse.json({ 
        success: true, 
        message: "No paid orders found to backfill.",
        created: 0,
        skipped: 0 
      });
    }

    let created = 0;
    let skipped = 0;

    for (const orderDoc of ordersSnap.docs) {
      const order = orderDoc.data();

      // 2. Check if a payment already exists for this order
      const existingPayment = await db.collection("payments")
        .where("orderId", "==", orderDoc.id)
        .limit(1)
        .get();

      if (!existingPayment.empty) {
        skipped++;
        continue; // Already backfilled — idempotent
      }

      // 3. Create payment document from order data
      const paymentRef = db.collection("payments").doc();
      await paymentRef.set({
        id: paymentRef.id,
        orderId: orderDoc.id,
        userId: order.userId || null,
        amount: Number(order.amount || order.total || order.totalAmount || 0),
        currency: order.currency || "GHS",
        status: "success",
        paymentMethod: order.paymentMethod || "unknown",
        paystackReference: order.paymentReference || orderDoc.id, // fallback
        paidAt: order.paidAt || order.updatedAt || FieldValue.serverTimestamp(),
        createdAt: order.createdAt || FieldValue.serverTimestamp(),
        metadata: {
          email: order.email || order.customerEmail || null,
          channel: order.paymentMethod || "unknown",
          backfilled: true, // Mark as backfilled for audit trail
        },
      });

      created++;
    }

    return NextResponse.json({
      success: true,
      message: `Backfill complete. Created: ${created}, Skipped (already exists): ${skipped}`,
      created,
      skipped,
    });
  } catch (error: any) {
    console.error("API ERROR [payments-backfill]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
