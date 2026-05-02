import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";
import { FORCE_PREMIUM } from "@/lib/constants/admin";

async function isAuthorized() {
  const session = await auth();
  const isDev = process.env.NODE_ENV === "development";
  return session?.user?.role === "admin" || (FORCE_PREMIUM && isDev);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAuthorized())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const docRef = db.collection("products").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      product: { id: docSnap.id, ...docSnap.data() },
    });
  } catch (error) {
    console.error("API ERROR [admin-product-get]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAuthorized())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Prevent modifying the reserved field from the admin dashboard
    if ("reserved" in body) {
      delete body.reserved;
    }

    // Enforce stock >= 0
    if ("stock" in body) {
      const stock = Number(body.stock);
      if (isNaN(stock) || stock < 0) {
        return NextResponse.json({ error: "Stock must be a valid positive number or 0" }, { status: 400 });
      }
      body.stock = stock;
    }

    if ("price" in body) {
      const price = Number(body.price);
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "Price must be a valid positive number" }, { status: 400 });
      }
      body.price = price;
    }

    body.updatedAt = FieldValue.serverTimestamp();

    const docRef = db.collection("products").doc(id);
    await docRef.update(body);

    return NextResponse.json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("API ERROR [admin-product-patch]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAuthorized())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const docRef = db.collection("products").doc(id);
    
    // Soft delete
    await docRef.update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully (soft delete)",
    });
  } catch (error) {
    console.error("API ERROR [admin-product-delete]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
