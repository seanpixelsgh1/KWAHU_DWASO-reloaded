import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/adminGuard";
import { getLowStockProducts, getOutOfStockProducts } from "@/lib/inventoryAlerts";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const [lowStock, outOfStock] = await Promise.all([
      getLowStockProducts(),
      getOutOfStockProducts()
    ]);

    return NextResponse.json({
      success: true,
      data: {
        lowStock,
        outOfStock
      }
    });
  } catch (error) {
    console.error("API ERROR [inventory-alerts-get]:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory alerts" },
      { status: 500 }
    );
  }
}
