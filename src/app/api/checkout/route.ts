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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const orderRef = existingOrderId 
      ? db.collection("orders").doc(existingOrderId) 
      : db.collection("orders").doc();
      
    const finalOrderId = orderRef.id;

    const total = orderAmount || items?.reduce((sum: number, item: any) => {
      const price = item.price || (item.total / (item.quantity || 1)) || 0;
      return sum + (price * (item.quantity || 1));
    }, 0) || 0;

    // ─────────────────────────────────────────────
    // 1. ATOMIC STOCK RESERVATION (Firestore Transaction)
    // ─────────────────────────────────────────────
    await db.runTransaction(async (tx) => {
      for (const item of items) {
        if (!item.productId) continue;

        const productRef = db.collection("products").doc(item.productId);
        const productDoc = await tx.get(productRef);

        if (!productDoc.exists) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const product = productDoc.data()!;
        const currentStock = product.stock || 0;
        const currentReserved = product.reserved || 0;
        const available = currentStock - currentReserved;

        if (available < (item.quantity || 1)) {
          throw new Error(`Insufficient stock for "${product.name || item.productId}". Available: ${available}, Requested: ${item.quantity || 1}`);
        }

        // Reserve stock
        tx.update(productRef, {
          reserved: currentReserved + (item.quantity || 1),
        });
      }

      // Create order INSIDE transaction after reservation
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      tx.set(orderRef, {
        orderId: finalOrderId,
        userId,
        email,
        customerEmail: email,
        amount: total,
        total: total,
        currency: "GHS",
        items: items || [],
        status: "pending",
        paymentStatus: "pending",
        paymentProvider: "paystack",
        paymentReference: null, // Will be set after Paystack init
        metadata: {
          source: "web",
          currency: "GHS",
        },
        paymentMethod: "card",
        shippingAddress: shippingAddress || null,
        expiresAt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    // ─────────────────────────────────────────────
    // 2. INITIALIZE PAYSTACK
    // ─────────────────────────────────────────────
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key is missing");
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/success?order_id=${finalOrderId}`;
    console.log("Paystack callback_url:", callbackUrl);

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

    // ─────────────────────────────────────────────
    // 3. SAVE PAYMENT REFERENCE
    // ─────────────────────────────────────────────
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
