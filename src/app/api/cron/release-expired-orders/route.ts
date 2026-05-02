import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { releaseInventory } from "@/lib/inventory";

/**
 * CRON: Release expired pending orders.
 * Orders with paymentStatus="pending" and expiresAt <= now
 * get their reserved stock released and status set to cancelled.
 *
 * Call this endpoint periodically (e.g. every 5 minutes via Vercel Cron).
 */
export async function GET(request: NextRequest) {
  try {
    // Simple auth via secret header (for Vercel Cron or manual trigger)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const snapshot = await db
      .collection("orders")
      .where("paymentStatus", "==", "pending")
      .where("expiresAt", "<=", now)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No expired orders found",
        released: 0,
      });
    }

    let released = 0;
    const errors: string[] = [];

    for (const doc of snapshot.docs) {
      try {
        // M-2: Pass log INTO releaseInventory for transactional consistency
        await releaseInventory(doc.ref, {
          event: "order_expired_released",
          message: "Payment timeout (15 min expiry)",
          actor: "system",
          level: "warning",
        });
        released++;
      } catch (err: any) {
        console.error(`Failed to release order ${doc.id}:`, err);
        errors.push(doc.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Released ${released} expired orders`,
      released,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("CRON ERROR [release-expired-orders]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
