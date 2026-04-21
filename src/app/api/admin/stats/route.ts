import { NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";

export async function GET() {
  try {
    // Fetch real data from Firebase using Admin SDK
    const [usersSnapshot, ordersSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("orders").get(),
    ]);

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });
    
    const orders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    }) as any[];

    // Calculate real stats
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (Number(order.amount) || Number(order.total) || 0),
      0
    );
    const pendingOrders = orders.filter(
      (order) => order.status === "pending"
    ).length;
    const completedOrders = orders.filter(
      (order) => order.status === "completed"
    ).length;

    const stats = {
      totalUsers: users.length,
      totalOrders: orders.length,
      totalRevenue: totalRevenue,
      totalProducts: 89, // This would come from products collection if you have it
      pendingOrders: pendingOrders,
      completedOrders: completedOrders,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("API ERROR [admin-stats-get]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

