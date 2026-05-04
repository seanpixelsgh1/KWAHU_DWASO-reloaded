import { NextRequest } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { confirmInventory, releaseInventory } from "@/lib/inventory";

async function processWebhookEvent(event: any) {
  try {
    const data = event.data;
    const reference = data?.reference;

    if (!reference) {
      console.error("WEBHOOK_ERROR", { type: "missing_reference", event: event.event });
      return;
    }

    // 1. Lookup payment by reference
    const paymentSnap = await db.collection("payments")
      .where("paystackReference", "==", reference)
      .limit(1)
      .get();

    if (paymentSnap.empty) {
      console.error("WEBHOOK_ERROR", { type: "payment_not_found", reference });
      return;
    }

    const paymentDoc = paymentSnap.docs[0];
    const paymentData = paymentDoc.data();

    // 2. Lookup linked order
    const orderRef = db.collection("orders").doc(paymentData.orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.error("WEBHOOK_ERROR", { type: "order_not_found", orderId: paymentData.orderId });
      return;
    }

    const orderData = orderDoc.data()!;

    // 3. Handle Successful Payment
    if (event.event === "charge.success") {
      // Idempotency Guard
      if (paymentData.status === "success") {
        console.log("WEBHOOK_INFO", { message: "Already processed", reference });
        return;
      }

      // Amount Validation (Anti-Tamper)
      // Paystack sends amount in kobo/pesewas. payment.amount is also in pesewas.
      if (data.amount !== paymentData.amount) {
        throw new Error(`Amount mismatch — possible tampering. Expected ${paymentData.amount}, got ${data.amount}`);
      }

      // Currency Validation
      if (data.currency?.toUpperCase() !== paymentData.currency?.toUpperCase()) {
         throw new Error(`Currency mismatch. Expected ${paymentData.currency}, got ${data.currency}`);
      }

      // Update payment doc
      await paymentDoc.ref.update({
        status: "success",
        paidAt: FieldValue.serverTimestamp(),
        paymentMethod: data.channel || "unknown",
      });

      // ATOMIC: Convert reservation → real stock deduction + mark paid
      const logPayload = {
        event: "payment_verified",
        message: "Payment successfully verified via webhook",
        actor: "system",
        level: "info",
        meta: { source: "webhook", reference: data.reference, raw: data }
      };

      await confirmInventory(orderDoc.ref, data, logPayload);

    } else if (event.event === "charge.failed" || event.event === "charge.abandoned") {
      // Idempotency Guard
      if (paymentData.status === "failed" || paymentData.status === "abandoned" || paymentData.status === "success") {
        return;
      }

      // Update payment doc
      await paymentDoc.ref.update({
        status: event.event === "charge.failed" ? "failed" : "abandoned",
      });

      // ROLLBACK: Release reserved stock
      const logPayload = {
        event: "payment_failed",
        message: "Payment failed or abandoned via webhook",
        actor: "system",
        level: "error",
        meta: { source: "webhook", reference: data.reference, raw: data }
      };

      // Only release if order is not already paid/processing
      if (orderData.paymentStatus === "pending") {
        await releaseInventory(orderDoc.ref, logPayload);
      }
    }
  } catch (error: any) {
    console.error("WEBHOOK_ERROR", {
      type: "process_webhook_event_error",
      error: error.message,
      stack: error.stack
    });

    // Dead letter queue — persist failed events for recovery
    try {
      await db.collection("webhook_failures").add({
        event,
        error: error.message,
        stack: error.stack,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (dlqError: any) {
      console.error("WEBHOOK_DLQ_ERROR", { error: dlqError.message });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Read Raw Body
    const rawBody = await req.text();

    // 2. Verify Paystack Signature
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error("WEBHOOK_ERROR", { type: "missing_secret" });
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
      console.error("WEBHOOK_ERROR", { type: "invalid_signature" });
      return new Response("Invalid signature", { status: 401 });
    }

    // 3. Parse Event
    const event = JSON.parse(rawBody);

    // 4. Background Processing
    processWebhookEvent(event).catch(console.error);

    // Immediately return 200 to acknowledge webhook
    return new Response("Webhook received", { status: 200 });
  } catch (error: any) {
    console.error("WEBHOOK_ERROR", {
      type: "paystack_post_error",
      error: error.message,
      stack: error.stack
    });
    return new Response("Internal server error", { status: 500 });
  }
}
