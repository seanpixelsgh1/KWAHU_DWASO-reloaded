import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { USER_ROLES } from "@/lib/rbac/permissions";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin, logAdminAction } from "@/lib/auth/adminGuard";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        role: data?.role || "user",
        isActive: data?.isActive !== false,
        lastLoginAt: data?.lastLoginAt?.toDate?.()?.toISOString() || null,
        createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt || null,
      };
    }) as any[];

    const ordersSnapshot = await db.collection("orders").get();
    const orders = ordersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    const usersWithOrderCount = users.map((user) => ({
      ...user,
      orders: orders.filter((o) => o.customerEmail === user.email).length,
      totalSpent: orders
        .filter((o) => o.customerEmail === user.email)
        .reduce((sum, o) => sum + (o.total || 0), 0),
    }));

    return NextResponse.json(usersWithOrderCount);
  } catch (error) {
    console.error("API ERROR [admin-users-get]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId, name, email, role, isActive } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // SELF-DESTRUCTION PREVENTION
    if (userId === admin.userId) {
      return NextResponse.json(
        { error: "You cannot modify your own account. Ask another admin." },
        { status: 403 }
      );
    }

    if (role !== undefined) {
      const validRoles = Object.values(USER_ROLES);
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Valid roles are: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const updateData: any = { updatedAt: FieldValue.serverTimestamp() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    await db.collection("users").doc(userId).update(updateData);

    // AUDIT LOGGING
    if (role !== undefined) {
      await logAdminAction({ actorId: admin.userId, action: "role_change", targetUserId: userId, metadata: { newRole: role } });
    }
    if (typeof isActive === "boolean") {
      await logAdminAction({ actorId: admin.userId, action: isActive ? "enable_user" : "disable_user", targetUserId: userId });
    }

    return NextResponse.json({
      success: true,
      message: `User updated successfully${role ? ` with role: ${role}` : ""}`,
    });
  } catch (error) {
    console.error("API ERROR [admin-users-put]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // SELF-DESTRUCTION PREVENTION
    if (userId === admin.userId) {
      return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 403 });
    }

    await db.collection("users").doc(userId).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await logAdminAction({ actorId: admin.userId, action: "delete_user", targetUserId: userId });

    return NextResponse.json({ success: true, message: "User deactivated" });
  } catch (error) {
    console.error("API ERROR [admin-users-delete]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
