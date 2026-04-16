import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 1. Accept POST request & Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // Do NOT trust frontend - Secure the webhook via HMAC SHA512 signature verify
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (secret && signature) {
      const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
      if (hash !== signature) {
        console.error("Paystack Webhook: Invalid Signature");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    
    // 2. Extract event
    const event = body.event;

    // 3. Handle ONLY "charge.success"
    if (event !== "charge.success") {
      return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    const data = body.data;
    
    // 4. Extract reference
    const reference = data.reference;

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    // 5. Fetch order using the reference (which maps to our doc.id)
    const orderRef = db.collection("orders").doc(reference);
    const orderDoc = await orderRef.get();

    // 6. If not found -> return 404
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderDoc.data();

    // 7. Idempotency check
    if (orderData?.paymentStatus === "paid") {
      return NextResponse.json({ message: "Order already paid" }, { status: 200 });
    }

    // 8. Verify amount matches (Paystack sends amount in lowest currency unit - pesewas/kobo)
    const expectedAmount = Math.round((orderData?.amount || 0) * 100);
    if (data.amount !== expectedAmount) {
      console.error(`Paystack Webhook: Amount Mismatch. Expected ${expectedAmount}, got ${data.amount}`);
      return NextResponse.json({ error: "Amount mismatch. Transaction rejected." }, { status: 400 });
    }

    // 9. Update order
    await orderRef.update({
      paymentStatus: "paid",
      status: "confirmed",
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 10. Return 200 OK
    return NextResponse.json({ message: "Webhook processed successfully" }, { status: 200 });

  } catch (error: any) {
    console.error("WEBHOOK ERROR [paystack]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
