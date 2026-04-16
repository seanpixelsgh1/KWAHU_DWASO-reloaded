import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";

export const POST = async (request: NextRequest) => {
  try {
    const session = await auth();
    const userId = session?.user?.id || "";
    
    const reqBody = await request.json();
    const { items, email, shippingAddress, orderId: existingOrderId, orderAmount } = reqBody;

    if (!email) {
      return NextResponse.json({ error: "Email is required for checkout" }, { status: 400 });
    }

    const orderRef = existingOrderId 
      ? db.collection("orders").doc(existingOrderId) 
      : db.collection("orders").doc();
      
    const finalOrderId = orderRef.id;

    const total = orderAmount || items?.reduce((sum: number, item: any) => {
      const price = item.price || (item.total / (item.quantity || 1)) || 0;
      return sum + (price * (item.quantity || 1));
    }, 0) || 0;
    
    // 1. Create order in Firestore (pending)
    await orderRef.set({
      orderId: finalOrderId,
      userId,
      email,
      amount: total,
      items: items || [],
      status: "pending",
      paymentStatus: "pending",
      paymentProvider: "paystack",
      paymentReference: null,
      metadata: {
        source: "web",
        currency: "GHS",
      },
      paymentMethod: "card",
      shippingAddress: shippingAddress || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 2. Call Paystack initialize endpoint
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key is missing");
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/success?order_id=${finalOrderId}`;

    const paystackPayload = {
      email: email,
      amount: Math.round(total * 100), // Convert to pesewas/kobo
      reference: finalOrderId,
      callback_url: callbackUrl,
    };

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackPayload),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error("Paystack Initialize Error:", paystackData);
      throw new Error(paystackData.message || "Failed to initialize payment");
    }

    // 3. Save returned reference to Firestore
    await orderRef.update({
      paymentReference: paystackData.data.reference,
    });

    // 4. Return authorization info
    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      orderId: finalOrderId,
    });

  } catch (error: any) {
    console.error("API ERROR [checkout]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" }, 
      { status: 500 }
    );
  }
};
