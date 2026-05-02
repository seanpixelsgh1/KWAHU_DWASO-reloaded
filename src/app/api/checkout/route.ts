import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";
import { releaseInventory } from "@/lib/inventory";

export const POST = async (request: NextRequest) => {
  try {
    const session = await auth();
    const userId = session?.user?.id || "";
    
    const reqBody = await request.json();
    const { items, email, shippingAddress, orderId: existingOrderId, idempotencyKey } = reqBody;

    if (!email) {
      return NextResponse.json({ error: "Email is required for checkout" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // ─────────────────────────────────────────────
    // 0. IDEMPOTENCY: Use idempotencyKey as doc ID for atomic uniqueness
    // ─────────────────────────────────────────────
    const docId = idempotencyKey || existingOrderId || db.collection("orders").doc().id;
    const orderRef = db.collection("orders").doc(docId);
    const finalOrderId = orderRef.id;

    // Check if this order already exists (idempotent retry)
    if (idempotencyKey) {
      const existingDoc = await orderRef.get();
      if (existingDoc.exists) {
        const existingData = existingDoc.data();
        // If already has an authorization_url cached, return it directly (no duplicate Paystack session)
        if (existingData?.authorization_url) {
          return NextResponse.json({
            success: true,
            authorization_url: existingData.authorization_url,
            orderId: existingDoc.id,
            idempotent: true,
          });
        }
      }
    }

    // Total is computed server-side from Firestore inside the transaction (see below)

    // ─────────────────────────────────────────────
    // 1. ATOMIC STOCK RESERVATION (Firestore Transaction)
    // ─────────────────────────────────────────────
    let total = 0;

    await db.runTransaction(async (tx) => {
      // SERVER-SIDE PRICING: Compute total from Firestore (never trust client prices)
      for (const item of items) {
        if (!item.productId) continue;

        const productRef = db.collection("products").doc(item.productId);
        const productDoc = await tx.get(productRef);

        if (!productDoc.exists) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const product = productDoc.data()!;
        const price = product.price || 0;
        const quantity = item.quantity || 1;
        const currentStock = product.stock || 0;
        const currentReserved = product.reserved || 0;
        const available = currentStock - currentReserved;

        if (available < quantity) {
          throw new Error(`Insufficient stock for "${product.name || item.productId}". Available: ${available}, Requested: ${quantity}`);
        }

        total += price * quantity;

        // Reserve stock
        tx.update(productRef, {
          reserved: currentReserved + quantity,
        });
      }

      // Create order INSIDE transaction after reservation
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Create order INSIDE transaction — paymentReference set atomically
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
        paymentReference: finalOrderId, // C-1: Set atomically (same value sent to Paystack)
        ...(idempotencyKey ? { idempotencyKey } : {}),
        metadata: {
          source: "web",
          currency: "GHS",
        },
        paymentMethod: "card",
        shippingAddress: shippingAddress || null,
        expiresAt,
        // O-1: Inventory tracking flags
        inventoryReserved: true,
        inventoryConfirmed: false,
        inventoryReleased: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // O-2: Log reservation event (after order creation in same tx)
      const logRef = orderRef.collection("logs").doc();
      tx.set(logRef, {
        event: "inventory_reserved",
        message: `Stock reserved for ${items.length} item(s)`,
        actor: "system",
        level: "info",
        createdAt: FieldValue.serverTimestamp(),
        meta: {
          items: items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity || 1,
          })),
        },
      });
    });

    // ─────────────────────────────────────────────
    // 2. INITIALIZE PAYSTACK (with inventory rollback on failure)
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

    let paystackData;

    try {
      const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paystackPayload),
      });

      paystackData = await paystackResponse.json();

      if (!paystackResponse.ok || !paystackData.status) {
        console.error("Paystack Initialize Error:", paystackData);
        throw new Error(paystackData.message || "Failed to initialize payment");
      }
    } catch (err) {
      // Release reserved inventory before propagating failure
      await releaseInventory(orderRef, {
        event: "payment_init_failed",
        message: "Paystack initialization failed — inventory released",
        actor: "system",
        level: "error",
      });
      throw err;
    }

    // Persist authorization_url to prevent duplicate Paystack sessions on retry
    await orderRef.update({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
    });

    // 4. Return authorization info (paymentReference already set in tx)
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
