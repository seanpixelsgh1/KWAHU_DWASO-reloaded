import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    let query: FirebaseFirestore.Query = db
      .collection("products")
      .where("isActive", "==", true);

    // Category filter (server-side)
    if (category) {
      query = query.where("category", "==", category.toLowerCase());
    }

    const snapshot = await query.get();

    let products = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        description: data.description || "",
        price: data.price || 0,
        stock: data.stock || 0,
        reserved: data.reserved || 0,
        images: data.images || [],
        category: data.category || "",
        brand: data.brand || "",
        discountPercentage: data.discountPercentage || 0,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    // In-memory text search (Firestore has no full-text search)
    if (search) {
      const term = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term)
      );
    }

    return NextResponse.json({ products, total: products.length });
  } catch (error: any) {
    console.error("API ERROR [products]:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
