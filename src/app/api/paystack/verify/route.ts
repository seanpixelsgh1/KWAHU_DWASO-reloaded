import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { confirmInventory } from "@/lib/inventory";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ success: false, error: "Missing or invalid orderId" }, { status: 400 });
    }

    // Find Order in Firestore
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderDoc.data();
    
    if (!orderData) {
      return NextResponse.json({ error: "Order data not found" }, { status: 404 });
    }
    
    const reference = orderData.paymentReference;
    if (!reference) {
      return NextResponse.json({ error: "Order has no payment reference" }, { status: 400 });
    }

    // Idempotency check
    if (orderData.paymentStatus === "paid") {
      console.log("Fallback verify: Already processed", { orderId: orderDoc.id, reference });
      return NextResponse.json({ success: true, paymentStatus: "paid" });
    }

    // Verify with Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key is missing");
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || paystackData.data?.status !== "success" || !paystackData.data?.reference) {
      console.error("API_VERIFY_ERROR", {
        type: "verification_failed",
        orderId: orderDoc.id,
        status: paystackData.data?.status,
        reference: paystackData.data?.reference
      });
      await orderRef.collection("logs").add({
        event: "payment_verification_failed",
        message: "Paystack rejected fallback verification",
        level: "error",
        actor: "system",
        createdAt: FieldValue.serverTimestamp(),
        meta: { source: "fallback", reason: "Paystack status not success", raw: paystackData }
      });
      return NextResponse.json({ error: "Payment not verified" }, { status: 400 });
    }

    // Reference Ownership Check
    if (orderData.paymentReference !== paystackData.data.reference) {
      console.error("API_VERIFY_ERROR", {
        type: "reference_mismatch",
        orderId: orderDoc.id,
        expectedReference: orderData.paymentReference,
        receivedReference: paystackData.data.reference,
      });
      await orderRef.collection("logs").add({
        event: "payment_verification_failed",
        message: "Reference mismatch during fallback verification",
        level: "error",
        actor: "system",
        createdAt: FieldValue.serverTimestamp(),
        meta: { source: "fallback", reason: "Reference mismatch" }
      });
      return NextResponse.json({ error: "Reference mismatch" }, { status: 400 });
    }

    // Validate Amount
    const expectedAmount = Number(orderData.amount) * 100;
    if (isNaN(expectedAmount)) {
      console.error("API_VERIFY_ERROR", { type: "invalid_order_amount", orderId: orderDoc.id });
      return NextResponse.json({ success: false, error: "Invalid order amount" }, { status: 400 });
    }

    if (paystackData.data.amount !== expectedAmount) {
      console.error("API_VERIFY_ERROR", {
        type: "amount_mismatch",
        orderId: orderDoc.id,
        reference: paystackData.data.reference,
        expected: expectedAmount,
        received: paystackData.data.amount,
      });
      await orderRef.collection("logs").add({
        event: "payment_verification_failed",
        message: "Amount mismatch during fallback verification",
        level: "error",
        actor: "system",
        createdAt: FieldValue.serverTimestamp(),
        meta: { source: "fallback", reason: "Amount mismatch" }
      });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Validate Currency
    if (paystackData.data.currency?.toUpperCase() !== orderData.currency?.toUpperCase()) {
      console.error("API_VERIFY_ERROR", {
        type: "currency_mismatch",
        orderId: orderDoc.id,
        reference: paystackData.data.reference,
        expected: orderData.currency,
        received: paystackData.data.currency,
      });
      await orderRef.collection("logs").add({
        event: "payment_verification_failed",
        message: "Currency mismatch during fallback verification",
        level: "error",
        actor: "system",
        createdAt: FieldValue.serverTimestamp(),
        meta: { source: "fallback", reason: "Currency mismatch" }
      });
      return NextResponse.json({ error: "Currency mismatch" }, { status: 400 });
    }

    // Validate Email
    if (paystackData.data.customer?.email?.toLowerCase() !== orderData.email?.toLowerCase()) {
      console.error("API_VERIFY_ERROR", {
        type: "email_mismatch",
        orderId: orderDoc.id,
        reference: paystackData.data.reference,
        expected: orderData.email,
        received: paystackData.data.customer?.email,
      });
      await orderRef.collection("logs").add({
        event: "payment_verification_failed",
        message: "Email mismatch during fallback verification",
        level: "error",
        actor: "system",
        createdAt: FieldValue.serverTimestamp(),
        meta: { source: "fallback", reason: "Email mismatch" }
      });
      return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
    }

    // Atomic: Convert reservation → real stock deduction + mark paid + log
    const logPayload = {
      event: "payment_verified_fallback",
      message: "Payment successfully verified via fallback system",
      actor: "system",
      level: "info",
      meta: { source: "fallback", reference: paystackData.data.reference, raw: paystackData.data }
    };

    await confirmInventory(orderRef, paystackData.data, logPayload);

    return NextResponse.json({ success: true, paymentStatus: "paid" });
  } catch (error: any) {
    console.error("API_VERIFY_ERROR", {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
