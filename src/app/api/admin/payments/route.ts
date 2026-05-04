import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { auth } from "@/auth";
import { FORCE_PREMIUM } from "@/lib/constants/admin";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const isDev = process.env.NODE_ENV === "development";
    const isAuthorized = session?.user?.role === "admin" || (FORCE_PREMIUM && isDev);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    let query: FirebaseFirestore.Query = db.collection("payments");

    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    // Sort by most recent
    query = query.orderBy("createdAt", "desc").limit(100);

    const snapshot = await query.get();
    
    const payments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: payments,
      total: payments.length
    });
  } catch (error: any) {
    console.error("API ERROR [admin-payments-get]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
