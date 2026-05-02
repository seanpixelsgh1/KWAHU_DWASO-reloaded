import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await db.collection("products").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const data = doc.data()!;

    if (data.isActive === false) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const product = {
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

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("API ERROR [products/:id]:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
