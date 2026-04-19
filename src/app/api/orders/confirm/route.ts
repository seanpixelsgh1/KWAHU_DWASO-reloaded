import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const orderId = body.orderId;
    const reference = body.reference || body.trxref;

    console.log("Incoming:", { orderId, reference });

    if (!orderId || !reference) {
      return NextResponse.json(
        { success: false, message: "Missing params" },
        { status: 400 }
      );
    }

    // Fetch directly using the orderId as the document ID
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderDoc.data();

    // Idempotency check: if already paid, return success (no-op)
    if (orderData?.paymentStatus === "paid") {
      return NextResponse.json({
        message: "Order already confirmed",
        success: true,
        order: {
          id: orderDoc.id,
          amount: orderData?.amount,
        }
      });
    }

    // Paystack Verification (MANDATORY)
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json({ error: "Payment verification unavailable" }, { status: 500 });
    }

    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    });

    const paystackData = await paystackResponse.json();
    console.log("Paystack response:", paystackData);

    // Validate Response (STRICT)
    if (!paystackResponse.ok || paystackData.data?.status !== "success") {
      console.error("Paystack Verification Failed:", paystackData);
      return NextResponse.json(
        { error: "Payment verification failed" }, 
        { status: 400 }
      );
    }

    // Update status and paymentStatus ONLY AFTER VERIFICATION
    console.log("Updating order:", orderId);
    await orderRef.update({
      status: "confirmed",
      paymentStatus: "paid",
      paymentReference: reference,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      message: "Order confirmed successfully",
      success: true,
      order: {
        id: orderId,
        amount: orderData?.amount,
      }
    });
  } catch (error) {
    console.error("API ERROR [orders-confirm]:", error);
    return NextResponse.json(
      { error: "Failed to confirm order" },
      { status: 500 }
    );
  }
}
