import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { confirmInventory, releaseInventory } from "@/lib/inventory";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin, logAdminAction } from "@/lib/auth/adminGuard";

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { reference } = await request.json();
    if (!reference) {
      return NextResponse.json({ error: "Reference is required" }, { status: 400 });
    }

    // 1. Fetch Firestore Payment
    const paymentSnap = await db.collection("payments")
      .where("paystackReference", "==", reference)
      .limit(1)
      .get();

    if (paymentSnap.empty) {
      return NextResponse.json({ error: "Payment not found in system" }, { status: 404 });
    }

    const paymentDoc = paymentSnap.docs[0];
    const paymentData = paymentDoc.data();

    // 2. Fetch linked Order
    const orderRef = db.collection("orders").doc(paymentData.orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Linked order not found" }, { status: 404 });
    }
    const orderData = orderDoc.data()!;

    // 3. Fetch Paystack Status
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    const paystackData = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: `Paystack API Error: ${paystackData.message}` }, { status: 400 });
    }

    const pData = paystackData.data;
    const pStatus = pData.status; // "success", "failed", "abandoned"

    // 4. Compare Status
    if (paymentData.status === pStatus) {
      return NextResponse.json({ 
        success: true, 
        message: `Already consistent (Status: ${pStatus})` 
      });
    }

    // 5. Amount validation (fraud protection layer)
    // Both are in pesewas
    if (pData.amount !== paymentData.amount && pStatus === "success") {
      return NextResponse.json({ 
        error: `Amount mismatch — Paystack: ${pData.amount}, System: ${paymentData.amount}` 
      }, { status: 400 });
    }

    // 6. Fix mismatch
    if (pStatus === "success") {
      await paymentDoc.ref.update({
        status: "success",
        paidAt: FieldValue.serverTimestamp(),
        paymentMethod: pData.channel || "unknown",
      });

      const logPayload = {
        event: "payment_reconciled",
        message: "Payment manually verified and marked successful via admin reconciliation",
        actor: admin.email,
        level: "info",
      };

      await confirmInventory(orderDoc.ref, pData, logPayload);

      return NextResponse.json({ success: true, message: "Fixed: Updated to Success" });

    } else if (pStatus === "failed" || pStatus === "abandoned") {
      await paymentDoc.ref.update({
        status: pStatus,
      });

      if (orderData.paymentStatus === "pending") {
        const logPayload = {
          event: "payment_reconciled",
          message: `Payment manually verified as ${pStatus} via admin reconciliation`,
          actor: admin.email,
          level: "error",
        };
        await releaseInventory(orderDoc.ref, logPayload);
      }

      return NextResponse.json({ success: true, message: `Fixed: Updated to ${pStatus}` });
    }

    return NextResponse.json({ error: `Unknown Paystack status: ${pStatus}` }, { status: 400 });

  } catch (error: any) {
    console.error("API ERROR [admin-payments-reconcile]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
