import { adminDb as db } from "@/lib/firebase/admin";
import { getSettings } from "@/lib/settings";

export interface AlertProduct {
  id: string;
  name: string;
  stock: number;
  reserved: number;
  available: number;
  threshold: number;
  lowStockNotified: boolean;
}

export async function getLowStockProducts(): Promise<AlertProduct[]> {
  const snapshot = await db.collection("products")
    .where("isActive", "==", true)
    .get();

  const lowStock: AlertProduct[] = [];
  const settings = await getSettings();
  const globalThreshold = settings.inventory.lowStockThreshold;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const stock = Number(data.stock || 0);
    const reserved = Number(data.reserved || 0);
    const available = stock - reserved;
    const threshold = Number(data.lowStockThreshold ?? globalThreshold);

    if (available <= threshold && available > 0) {
      lowStock.push({
        id: doc.id,
        name: data.name || "Unknown Product",
        stock,
        reserved,
        available,
        threshold,
        lowStockNotified: !!data.lowStockNotified,
      });
    }
  });

  return lowStock;
}

export async function getOutOfStockProducts(): Promise<AlertProduct[]> {
  const snapshot = await db.collection("products")
    .where("isActive", "==", true)
    .get();

  const outOfStock: AlertProduct[] = [];

  const settings = await getSettings();
  const globalThreshold = settings.inventory.lowStockThreshold;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const stock = Number(data.stock || 0);
    const reserved = Number(data.reserved || 0);
    const available = stock - reserved;
    const threshold = Number(data.lowStockThreshold ?? globalThreshold);

    if (available <= 0) {
      outOfStock.push({
        id: doc.id,
        name: data.name || "Unknown Product",
        stock,
        reserved,
        available,
        threshold,
        lowStockNotified: !!data.lowStockNotified,
      });
    }
  });

  return outOfStock;
}

export async function getInventoryStatus(product: { stock?: number; reserved?: number; lowStockThreshold?: number }) {
  const stock = Number(product.stock || 0);
  const reserved = Number(product.reserved || 0);
  const available = stock - reserved;
  
  const settings = await getSettings();
  const threshold = Number(product.lowStockThreshold ?? settings.inventory.lowStockThreshold);

  if (available <= 0) return "out";
  if (available <= threshold) return "low";
  return "healthy";
}
