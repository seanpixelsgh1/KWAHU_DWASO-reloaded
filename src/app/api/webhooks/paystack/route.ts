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
        console.error("WEBHOOK_ERROR", { type: "order_not_found", reference });
        return;
      }

      const orderDoc = orderQuery.docs[0];
      const orderData = orderDoc.data();

      // 6. Idempotency Protection (Outer Guard, inner guard is in confirmInventory)
      if (orderData.paymentStatus === "paid") {
        console.log("WEBHOOK_INFO", { message: "Already processed", orderId: orderDoc.id, reference });
        return;
      }

      // Reference Ownership Check
      if (orderData.paymentReference !== data.reference) {
        console.error("WEBHOOK_ERROR", {
          type: "reference_mismatch",
          orderId: orderDoc.id,
          expectedReference: orderData.paymentReference,
          receivedReference: data.reference,
        });
        return;
      }

      // 7. Amount Validation (Anti-Tamper)
      const expectedAmount = Number(orderData.amount) * 100;
      if (isNaN(expectedAmount)) {
        console.error("WEBHOOK_ERROR", { type: "invalid_order_amount", orderId: orderDoc.id });
        return;
      }

      if (data.amount !== expectedAmount) {
        console.error("WEBHOOK_ERROR", {
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
        console.error("WEBHOOK_ERROR", {
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
        console.error("WEBHOOK_ERROR", {
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
      const logPayload = {
        event: "payment_verified",
        message: "Payment successfully verified via webhook",
        actor: "system",
        level: "info",
        meta: { source: "webhook", reference: data.reference, raw: data }
      };

      await confirmInventory(orderDoc.ref, data, logPayload);

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
        
        const logPayload = {
          event: "payment_failed",
          message: "Payment failed via webhook",
          actor: "system",
          level: "error",
          meta: { source: "webhook", reference: data.reference, raw: data }
        };

        await releaseInventory(orderDoc.ref, logPayload);
      }
    }
  } catch (error: any) {
    console.error("WEBHOOK_ERROR", {
      type: "process_webhook_event_error",
      error: error.message,
      stack: error.stack
    });
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
