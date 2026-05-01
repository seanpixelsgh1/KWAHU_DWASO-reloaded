import { NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { withTimeout } from "@/lib/utils/withTimeout";

export async function GET() {
  try {
    const ordersSnapshot = await withTimeout(db.collection("orders").get());
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    let todaysRevenue = 0;
    let last7DaysOrders = 0;
    let failedPayments = 0;
    let pendingOrders = 0;

    ordersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      
      let createdAtDate = new Date();
      if (data.createdAt) {
        if (typeof data.createdAt.toDate === "function") {
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === "string" || typeof data.createdAt === "number") {
          const parsedDate = new Date(data.createdAt);
          if (!isNaN(parsedDate.getTime())) {
            createdAtDate = parsedDate;
          }
        }
      }

      const isPaid = data.paymentStatus === "paid" || data.paymentStatus === "success";
      if (createdAtDate >= startOfToday && isPaid) {
        todaysRevenue += (typeof data.amount === "number" ? data.amount : 0);
      }

      if (createdAtDate >= sevenDaysAgo) {
        last7DaysOrders += 1;
      }

      if (data.paymentStatus === "failed") {
        failedPayments += 1;
      }

      if (data.status === "pending" || data.status === "processing") {
        pendingOrders += 1;
      }
    });

    return NextResponse.json({
      todaysRevenue,
      last7DaysOrders,
      failedPayments,
      pendingOrders,
    });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

