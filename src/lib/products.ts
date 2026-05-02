import { adminDb as db } from "@/lib/firebase/admin";
import { ProductType } from "../../type";

/**
 * Fetch all active products from Firestore.
 * Server-side only (uses Firebase Admin SDK).
 */
export async function getAllProducts(): Promise<ProductType[]> {
  const snapshot = await db
    .collection("products")
    .where("isActive", "==", true)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    // Normalize timestamps for serialization
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || null,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString?.() || null,
  })) as ProductType[];
}

/**
 * Fetch a single product by ID.
 * Returns null if not found or inactive.
 */
export async function getProductById(id: string): Promise<ProductType | null> {
  const doc = await db.collection("products").doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.isActive === false) return null;

  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
  } as ProductType;
}

/**
 * Derive unique categories from all active products.
 * Firestore has no DISTINCT — we do it in memory.
 */
export async function getCategories(): Promise<
  { name: string; slug: string; count: number }[]
> {
  const products = await getAllProducts();
  const categoryMap = new Map<string, number>();

  products.forEach((p) => {
    const cat = (p.category || "uncategorized").toLowerCase();
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });

  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    name,
    slug: name.replace(/\s+/g, "-").toLowerCase(),
    count,
  }));
}

/**
 * Search products by name/description/category (in-memory).
 * Firestore does NOT support full-text search natively.
 */
export async function searchProducts(query: string): Promise<ProductType[]> {
  if (!query || !query.trim()) return [];

  const products = await getAllProducts();
  const term = query.toLowerCase();

  return products.filter(
    (p) =>
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.brand?.toLowerCase().includes(term)
  );
}
