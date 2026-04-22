import { NextRequest } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

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

    // 4. Handle Successful Payment
    if (event.event === "charge.success") {
      // 5. Extract Data
      const data = event.data;
      const reference = data.reference;
      
      // Amount in Paystack is usually in the lowest denomination (pesewas), so if we want to log it
      const amount = data.amount / 100; // convert from pesewas/kobo -> GHS
      const email = data.customer.email;

      // 6. Find Order in Firestore
      const orderQuery = await db
        .collection("orders")
        .where("paymentReference", "==", reference)
        .limit(1)
        .get();

      if (orderQuery.empty) {
        console.error("Order not found for reference:", reference);
        return new Response("Order not found", { status: 404 });
      }

      const orderDoc = orderQuery.docs[0];

      // 7. Idempotency Protection
      const orderData = orderDoc.data();

      if (orderData.paymentStatus === "paid") {
        return new Response("Already processed", { status: 200 });
      }

      // 8. Update Order
      await orderDoc.ref.update({
        paymentStatus: "paid",
        status: "processing",
        paidAt: FieldValue.serverTimestamp(),
        paymentMethod: "paystack",
        updatedAt: FieldValue.serverTimestamp(),
      });
      
    } else if (event.event === "charge.failed") {
      // 9. Handle Failed Payments (Optional)
      const data = event.data;
      const reference = data.reference;

      const orderQuery = await db
        .collection("orders")
        .where("paymentReference", "==", reference)
        .limit(1)
        .get();

      if (!orderQuery.empty) {
        const orderDoc = orderQuery.docs[0];
        
        await orderDoc.ref.update({
          paymentStatus: "failed",
          status: "pending", // Or some failed status
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // 10. Final Response
    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("WEBHOOK ERROR [paystack]:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
