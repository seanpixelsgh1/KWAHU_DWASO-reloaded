import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { USER_ROLES } from "@/lib/rbac/permissions";
import { FieldValue } from "firebase-admin/firestore";
import { auth } from "@/auth";
import { FORCE_PREMIUM } from "@/lib/constants/admin";

async function isAuthorized() {
  const session = await auth();
  const isDev = process.env.NODE_ENV === "development";
  return session?.user?.role === "admin" || (FORCE_PREMIUM && isDev);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch real users from Firebase using Admin SDK
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        role: data?.role || "user",
        isActive: data?.isActive !== false, // default to true
        lastLoginAt: data?.lastLoginAt?.toDate?.()?.toISOString() || null,
        createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt || null,
      };
    }) as any[];

    // Get order counts for each user using Admin SDK
    const ordersSnapshot = await db.collection("orders").get();
    const orders = ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    }) as any[];

    const usersWithOrderCount = users.map((user) => ({
      ...user,
      orders: orders.filter((order) => order.customerEmail === user.email)
        .length,
      totalSpent: orders
        .filter((order) => order.customerEmail === user.email)
        .reduce((sum, order) => sum + (order.total || 0), 0),
    }));

    return NextResponse.json(usersWithOrderCount);
  } catch (error) {
    console.error("API ERROR [admin-users-get]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await isAuthorized())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId, name, email, role, isActive } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = Object.values(USER_ROLES);
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Valid roles are: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    // Update user in Firebase using Admin SDK
    await db.collection("users").doc(userId).update(updateData);

    return NextResponse.json({
      success: true,
      message: `User updated successfully${role ? ` with role: ${role}` : ""}`,
    });
  } catch (error) {
    console.error("API ERROR [admin-users-put]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAuthorized())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Soft delete — deactivate instead of destroying data
    await db.collection("users").doc(userId).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: "User deactivated" });
  } catch (error) {
    console.error("API ERROR [admin-users-delete]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

