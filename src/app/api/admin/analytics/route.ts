import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/adminGuard";
import {
  getDashboardMetrics,
  getSalesOverTime,
  getTopProducts,
  getRecentOrders
} from "@/lib/analytics";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range") || "30d";
    const range = ["7d", "30d", "12m"].includes(rangeParam) ? rangeParam as "7d" | "30d" | "12m" : "30d";

    const [metrics, sales, topProducts, recentOrders] = await Promise.all([
      getDashboardMetrics(),
      getSalesOverTime(range),
      getTopProducts(5),
      getRecentOrders(10)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        sales,
        topProducts,
        recentOrders
      }
    });

  } catch (error) {
    console.error("API ERROR [admin-analytics-get]:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}

