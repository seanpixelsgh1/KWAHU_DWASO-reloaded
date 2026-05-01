import { NextRequest } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { confirmInventory, releaseInventory } from "@/lib/inventory";

async function processWebhookEvent(event: any) {
  try {
    // 4. Handle Successful Payment
    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;

      // 5. Find Order in Firestore
      const orderQuery = await db
        .collection("orders")
        .where("paymentReference", "==", reference)
        .limit(1)
        .get();

      if (orderQuery.empty) {
        console.error("Order not found for reference:", reference);
        return;
      }

      const orderDoc = orderQuery.docs[0];
      const orderData = orderDoc.data();

      // 6. Idempotency Protection
      if (orderData.paymentStatus === "paid") {
        console.log("Already processed", { orderId: orderDoc.id, reference });
        return;
      }

      // Reference Ownership Check
      if (orderData.paymentReference !== data.reference) {
        console.error("Validation failed", {
          type: "reference_mismatch",
          orderId: orderDoc.id,
          expectedReference: orderData.paymentReference,
          receivedReference: data.reference,
        });
        return;
      }

      // 7. Amount Validation (Anti-Tamper)
      const expectedAmount = Math.round(orderData.amount * 100);
      if (data.amount !== expectedAmount) {
        console.error("Validation failed", {
          type: "amount_mismatch",
          orderId: orderDoc.id,
          reference: data.reference,
          expected: expectedAmount,
          received: data.amount,
        });
        return;
      }

      // Currency Validation
      if (data.currency?.toUpperCase() !== orderData.currency?.toUpperCase()) {
        console.error("Validation failed", {
          type: "currency_mismatch",
          orderId: orderDoc.id,
          reference: data.reference,
          expected: orderData.currency,
          received: data.currency,
        });
        return;
      }

      // Email Validation
      if (data.customer?.email?.toLowerCase() !== orderData.email?.toLowerCase()) {
        console.error("Validation failed", {
          type: "email_mismatch",
          orderId: orderDoc.id,
          reference: data.reference,
          expected: orderData.email,
          received: data.customer?.email,
        });
        return;
      }

      // ─────────────────────────────────────────────
      // 8. ATOMIC: Convert reservation → real stock deduction + mark paid
      // ─────────────────────────────────────────────
      await confirmInventory(orderDoc.ref, data);

      // 9. Add Payment Audit Log
      await orderDoc.ref.collection("logs").add({
        event: "payment_verified",
        payload: data,
        createdAt: FieldValue.serverTimestamp(),
      });

    } else if (event.event === "charge.failed") {
      // ─────────────────────────────────────────────
      // 10. ROLLBACK: Release reserved stock on payment failure
      // ─────────────────────────────────────────────
      const data = event.data;
      const reference = data.reference;

      const orderQuery = await db
        .collection("orders")
        .where("paymentReference", "==", reference)
        .limit(1)
        .get();

      if (!orderQuery.empty) {
        const orderDoc = orderQuery.docs[0];
        await releaseInventory(orderDoc.ref);

        // Audit log for failed payment
        await orderDoc.ref.collection("logs").add({
          event: "payment_failed",
          payload: data,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error("WEBHOOK ERROR [processWebhookEvent]:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Read Raw Body
    const rawBody = await req.text();

    // 2. Verify Paystack Signature
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY is missing");
      return new Response("Server error", { status: 500 });
    }

    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.error("Paystack Webhook: Invalid Signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // 3. Parse Event
    const event = JSON.parse(rawBody);

    // 4. Background Processing
    processWebhookEvent(event).catch(console.error);

    // Immediately return 200 to acknowledge webhook
    return new Response("Webhook received", { status: 200 });
  } catch (error) {
    console.error("WEBHOOK ERROR [paystack]:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
