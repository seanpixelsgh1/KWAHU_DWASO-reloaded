import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLowStockProducts, getOutOfStockProducts } from "@/lib/inventoryAlerts";
import { FORCE_PREMIUM } from "@/lib/constants/admin";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const isDev = process.env.NODE_ENV === "development";

    const isAuthorized = 
      session?.user?.role === "admin" || 
      (FORCE_PREMIUM && isDev);

    if (!isAuthorized) {
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
