import { auth } from "@/auth";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export interface AdminSession {
  userId: string;
  email: string;
  role: string;
}

/**
 * Firestore-verified admin authorization.
 * NEVER trusts the session role alone — always re-validates from Firestore.
 * 
 * Returns the verified admin session, or null if unauthorized.
 */
export async function verifyAdmin(): Promise<AdminSession | null> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return null;
  }

  // CRITICAL: Re-validate role from Firestore (never trust JWT/session alone)
  try {
    const userDoc = await db.collection("users").doc(session.user.id).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data()!;

    // Block disabled users
    if (userData.isActive === false) {
      return null;
    }

    // Verify admin role from Firestore (source of truth)
    if (userData.role !== "admin") {
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email,
      role: userData.role,
    };
  } catch (error) {
    console.error("Admin verification failed:", error);
    return null;
  }
}

/**
 * Log a critical admin action for audit trail.
 */
export async function logAdminAction(params: {
  actorId: string;
  action: "role_change" | "disable_user" | "enable_user" | "delete_user" | "update_user" | "reconcile_payment" | "backfill_payments";
  targetUserId?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await db.collection("audit_logs").add({
      ...params,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Never let audit logging break the main flow
    console.error("Failed to write audit log:", error);
  }
}
