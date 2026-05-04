import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/auth/adminGuard";

const allowedTransitions: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

// Transitions that require payment to be verified
const requiresPayment = new Set(["processing", "delivered"]);

function normalizeStatus(raw: string | undefined): string {
  const s = raw?.toLowerCase();
  if (["pending", "processing", "delivered", "cancelled"].includes(s || "")) return s!;
  if (s === "completed") return "delivered";
  return "pending";
}

function normalizePaymentStatus(raw: string | undefined): string {
  const s = raw?.toLowerCase();
  if (["pending", "paid", "failed"].includes(s || "")) return s!;
  if (s === "success") return "paid";
  return "pending";
}

export async function PUT(request: NextRequest) {
  try {
    // ── 1. ROLE VALIDATION ──────────────────────────────────────────
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Forbidden — Administrator access required" },
        { status: 403 }
      );
    }

    // ── 2. INPUT VALIDATION ─────────────────────────────────────────
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or status" },
        { status: 400 }
      );
    }

    const newStatus = status.toLowerCase();

    // ── 3. ATOMIC TRANSACTION ───────────────────────────────────────
    const orderRef = db.collection("orders").doc(orderId);

    const result = await db.runTransaction(async (tx) => {
      const orderDoc = await tx.get(orderRef);

      if (!orderDoc.exists) {
        return { code: 404, error: "Order not found" };
      }

      const data = orderDoc.data() || {};
      const currentStatus = normalizeStatus(data.status);
      const paymentStatus = normalizePaymentStatus(data.paymentStatus);

      // ── Idempotency Protection ──
      if (currentStatus === newStatus) {
        return { code: 200, noop: true };
      }

      // ── Strict State-Machine Check ──
      const validNextStates = allowedTransitions[currentStatus] || [];
      if (!validNextStates.includes(newStatus)) {
        return {
          code: 400,
          error: `Invalid transition: Cannot move from '${currentStatus}' to '${newStatus}'`,
        };
      }

      // ── Payment Lock Enforcement ──
      if (requiresPayment.has(newStatus) && paymentStatus !== "paid") {
        return {
          code: 400,
          error: `Cannot mark order as '${newStatus}' — payment has not been verified (current: ${paymentStatus})`,
        };
      }

      // ── Determine Log ──
      let logMessage = `Order status updated to ${newStatus}`;
      let logLevel: "info" | "warning" | "error" = "info";

      if (newStatus === "cancelled") {
        logMessage = "Order was cancelled by admin";
        logLevel = "warning";
      } else if (newStatus === "processing") {
        logMessage = "Order marked as processing";
      } else if (newStatus === "delivered") {
        logMessage = "Order marked as delivered";
      }

      // ── Update Order Status ──
      tx.update(orderRef, {
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // ── Standardised Audit Log ──
      const logRef = orderRef.collection("logs").doc();
      tx.set(logRef, {
        event: "status_updated",
        message: logMessage,
        level: logLevel,
        actor: "admin",
        createdAt: FieldValue.serverTimestamp(),
        meta: {
          previousStatus: currentStatus,
          newStatus: newStatus,
          initiatedBy: session?.user?.email || "admin",
        },
      });

      // ── Inventory Adjustment on Cancel (C-3: status-aware) ──
      if (newStatus === "cancelled") {
        const items = Array.isArray(data.items) ? data.items : [];
        let releasedCount = 0;

        for (const item of items) {
          const productId = item.productId || item.id;
          const quantity = typeof item.quantity === "number" ? item.quantity : 1;

          if (productId && quantity > 0) {
            const productRef = db.collection("products").doc(productId);

            if (currentStatus === "pending") {
              // PENDING → stock was reserved, not deducted. Release reservation only.
              tx.update(productRef, {
                reserved: FieldValue.increment(-quantity),
              });
            } else if (currentStatus === "processing") {
              // PROCESSING → stock was deducted. Restore actual stock + reset flag.
              tx.update(productRef, {
                stock: FieldValue.increment(quantity),
              });
            }
            releasedCount += quantity;
          }
        }

        // Mark payment as failed when cancelling a pending order
        // Reset inventoryConfirmed when cancelling a processing order
        const cancelUpdates: Record<string, any> = {};
        if (currentStatus === "pending") {
          cancelUpdates.paymentStatus = "failed";
          cancelUpdates.inventoryReleased = true;
        } else if (currentStatus === "processing") {
          cancelUpdates.inventoryConfirmed = false;
          cancelUpdates.inventoryReleased = true;
        }
        if (Object.keys(cancelUpdates).length > 0) {
          tx.update(orderRef, cancelUpdates);
        }

        if (releasedCount > 0) {
          const invLogRef = orderRef.collection("logs").doc();
          tx.set(invLogRef, {
            event: "inventory_released",
            message: `Inventory ${currentStatus === "pending" ? "reservation released" : "restored"}: ${releasedCount} unit(s)`,
            level: "info",
            actor: "system",
            createdAt: FieldValue.serverTimestamp(),
            meta: { unitsReleased: releasedCount, previousStatus: currentStatus },
          });
        }
      }

      return { code: 200 };
    });

    // ── 4. RESPOND ──────────────────────────────────────────────────
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.code }
      );
    }

    if (result.noop) {
      return NextResponse.json({
        success: true,
        message: "Status is already up to date (no-op).",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API ERROR [admin-orders-update-status]:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
