import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { adminDb as db } from "@/lib/firebase/admin";
import { getSettings, invalidateSettingsCache, settingsSchema } from "@/lib/settings";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getSettings();

    // Strip secret key if it somehow ended up in there
    if ((settings as any).paystack?.secretKey) {
      delete (settings as any).paystack.secretKey;
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("GET Settings Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate using Zod
    const parsed = settingsSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    // Add updatedAt
    const updatePayload = {
      ...payload,
      updatedAt: FieldValue.serverTimestamp()
    };

    // Safe merge update
    await db.collection("settings").doc("global").set(updatePayload, { merge: true });

    // Invalidate the cache
    invalidateSettingsCache();

    // Audit logging
    await db.collection("audit_logs").add({
      actorId: session.user.id,
      action: "update_settings",
      metadata: payload,
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (error: any) {
    console.error("PATCH Settings Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
