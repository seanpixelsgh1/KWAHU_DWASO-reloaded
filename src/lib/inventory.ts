import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Release reserved inventory for a pending order.
 * Idempotent: skips if order is not "pending".
 */
export async function releaseInventory(
  orderRef: FirebaseFirestore.DocumentReference,
  logPayload?: Record<string, any>
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const orderDoc = await tx.get(orderRef);
    const order = orderDoc.data();

    if (!order) return;
    if (order.paymentStatus !== "pending") return;

    for (const item of order.items || []) {
      if (!item.productId) continue;
      const productRef = db.collection("products").doc(item.productId);
      const productDoc = await tx.get(productRef);
      const product = productDoc.data();

      if (!product) continue;

      tx.update(productRef, {
        reserved: Math.max(0, (product.reserved || 0) - (item.quantity || 0)),
      });
    }

    tx.update(orderRef, {
      paymentStatus: "failed",
      status: "cancelled",
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (logPayload) {
      const logRef = orderRef.collection("logs").doc();
      tx.set(logRef, {
        ...logPayload,
        createdAt: FieldValue.serverTimestamp()
      });
    }
  });
}

/**
 * Convert reserved inventory to a real stock deduction after confirmed payment.
 * Runs inside a Firestore transaction for atomicity.
 */
export async function confirmInventory(
  orderRef: FirebaseFirestore.DocumentReference,
  webhookData?: Record<string, any>,
  logPayload?: Record<string, any>,
  extraUpdates?: Record<string, any>
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const orderDoc = await tx.get(orderRef);
    const order = orderDoc.data();

    if (!order) return;
    // Idempotency — already processed
    if (order.paymentStatus === "paid") return;

    const isInventoryConfirmed = typeof order.inventoryConfirmed === "undefined" ? false : order.inventoryConfirmed;

    if (!isInventoryConfirmed) {
      for (const item of order.items || []) {
        if (!item.productId) continue;
        const productRef = db.collection("products").doc(item.productId);
        const productDoc = await tx.get(productRef);
        const product = productDoc.data();

        if (!product) continue;

        tx.update(productRef, {
          stock: Math.max(0, (product.stock || 0) - (item.quantity || 0)),
          reserved: Math.max(0, (product.reserved || 0) - (item.quantity || 0)),
        });
      }
    }

    tx.update(orderRef, {
      paymentStatus: "paid",
      status: order.status === "pending" ? "processing" : order.status,
      paidAt: FieldValue.serverTimestamp(),
      paymentMethod: "paystack",
      gatewayResponse: webhookData?.gateway_response || webhookData?.source || "Successful",
      updatedAt: FieldValue.serverTimestamp(),
      inventoryConfirmed: true,
      ...(extraUpdates || {})
    });

    if (logPayload) {
      const logRef = orderRef.collection("logs").doc();
      tx.set(logRef, {
        ...logPayload,
        createdAt: FieldValue.serverTimestamp()
      });
    }
  });
}
