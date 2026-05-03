import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// Helper to filter out pending/failed orders
function isValidOrder(status: string, paymentStatus: string) {
  const validStatuses = ["paid", "processing", "shipped", "delivered"];
  return validStatuses.includes(status?.toLowerCase()) || paymentStatus?.toLowerCase() === "paid";
}

export async function getDashboardMetrics() {
  const snapshot = await db.collection("orders").get();
  const orders = snapshot.docs.map((doc) => doc.data());

  const validOrders = orders.filter((o) => isValidOrder(o.status, o.paymentStatus));

  let totalRevenue = 0;
  const uniqueCustomers = new Set();

  validOrders.forEach((o) => {
    totalRevenue += Number(o.amount || o.total || 0); // Handle legacy 'total' field
    if (o.email || o.userId) {
      uniqueCustomers.add(o.email || o.userId);
    }
  });

  const totalOrdersCount = validOrders.length;
  const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  return {
    totalRevenue: Math.round(totalRevenue), // already in pesewas
    totalOrders: totalOrdersCount,
    totalCustomers: uniqueCustomers.size,
    averageOrderValue: Math.round(averageOrderValue),
  };
}

export async function getSalesOverTime(range: "7d" | "30d" | "12m") {
  const now = new Date();
  let startDate = new Date();

  if (range === "7d") startDate.setDate(now.getDate() - 7);
  else if (range === "30d") startDate.setDate(now.getDate() - 30);
  else if (range === "12m") startDate.setMonth(now.getMonth() - 12);

  const snapshot = await db.collection("orders")
    .where("createdAt", ">=", startDate)
    .orderBy("createdAt", "asc")
    .get();

  const orders = snapshot.docs.map(doc => ({
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
  }));

  const validOrders = orders.filter((o) => isValidOrder(o.status, o.paymentStatus));

  const grouped: Record<string, { revenue: number; orders: number }> = {};

  validOrders.forEach((o) => {
    const date = o.createdAt;
    if (isNaN(date.getTime())) return;

    let key = "";
    if (range === "12m") {
      // Group by month
      key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    } else {
      // Group by day
      key = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    if (!grouped[key]) grouped[key] = { revenue: 0, orders: 0 };
    grouped[key].revenue += Number(o.amount || o.total || 0);
    grouped[key].orders += 1;
  });

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    revenue: Math.round(data.revenue),
    orders: data.orders,
  }));
}

export async function getTopProducts(limit = 5) {
  const snapshot = await db.collection("orders").get();
  const orders = snapshot.docs.map((doc) => doc.data());

  const validOrders = orders.filter((o) => isValidOrder(o.status, o.paymentStatus));

  const productStats: Record<string, { name: string; totalSold: number; revenue: number }> = {};

  validOrders.forEach((o) => {
    if (Array.isArray(o.items)) {
      o.items.forEach((item: any) => {
        if (!item.productId) return;
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.name || "Unknown Product",
            totalSold: 0,
            revenue: 0,
          };
        }
        productStats[item.productId].totalSold += Number(item.quantity || 1);
        productStats[item.productId].revenue += Number(item.price || 0) * Number(item.quantity || 1);
      });
    }
  });

  return Object.entries(productStats)
    .map(([productId, stats]) => ({
      productId,
      name: stats.name,
      totalSold: stats.totalSold,
      revenue: Math.round(stats.revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getRecentOrders(limit = 10) {
  const snapshot = await db.collection("orders")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    let dateStr = new Date().toISOString();
    if (data.createdAt) {
      if (typeof data.createdAt.toDate === "function") dateStr = data.createdAt.toDate().toISOString();
      else if (typeof data.createdAt === "string" || typeof data.createdAt === "number") {
        const parsed = new Date(data.createdAt);
        if (!isNaN(parsed.getTime())) dateStr = parsed.toISOString();
      }
    }

    return {
      id: doc.id,
      userEmail: data.email || data.customerEmail || "Unknown",
      totalAmount: Math.round(Number(data.amount || data.total || 0)),
      status: data.status || "pending",
      paymentStatus: data.paymentStatus || "pending",
      createdAt: dateStr,
    };
  });
}
