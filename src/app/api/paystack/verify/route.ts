import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { confirmInventory } from "@/lib/inventory";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
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

    if (!paystackResponse.ok || paystackData.data?.status !== "success") {
      console.error("Fallback Verification Failed:", paystackData);
      return NextResponse.json({ error: "Payment not verified" }, { status: 400 });
    }

    // Reference Ownership Check
    if (orderData.paymentReference !== paystackData.data.reference) {
      console.error("Validation failed", {
        type: "reference_mismatch",
        orderId: orderDoc.id,
        expectedReference: orderData.paymentReference,
        receivedReference: paystackData.data.reference,
      });
      return NextResponse.json({ error: "Reference mismatch" }, { status: 400 });
    }

    // Validate Amount
    const expectedAmount = Math.round(orderData.amount * 100);
    if (paystackData.data.amount !== expectedAmount) {
      console.error("Validation failed", {
        type: "amount_mismatch",
        orderId: orderDoc.id,
        reference: paystackData.data.reference,
        expected: expectedAmount,
        received: paystackData.data.amount,
      });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Validate Currency
    if (paystackData.data.currency?.toUpperCase() !== orderData.currency?.toUpperCase()) {
      console.error("Validation failed", {
        type: "currency_mismatch",
        orderId: orderDoc.id,
        reference: paystackData.data.reference,
        expected: orderData.currency,
        received: paystackData.data.currency,
      });
      return NextResponse.json({ error: "Currency mismatch" }, { status: 400 });
    }

    // Validate Email
    if (paystackData.data.customer?.email?.toLowerCase() !== orderData.email?.toLowerCase()) {
      console.error("Validation failed", {
        type: "email_mismatch",
        orderId: orderDoc.id,
        reference: paystackData.data.reference,
        expected: orderData.email,
        received: paystackData.data.customer?.email,
      });
      return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
    }

    // Atomic: Convert reservation → real stock deduction + mark paid
    await confirmInventory(orderRef, paystackData.data);

    // Add Audit Log
    await orderRef.collection("logs").add({
      event: "payment_verified_fallback",
      payload: paystackData.data,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, paymentStatus: "paid" });
  } catch (error) {
    console.error("API ERROR [fallback-verify]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
