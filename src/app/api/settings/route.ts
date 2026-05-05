import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = await getSettings();

    // Strip sensitive info
    const publicSettings = {
      currency: settings.currency,
      store: settings.store,
      features: settings.features,
      paystack: {
        publicKey: settings.paystack?.publicKey || "",
      }
    };

    return NextResponse.json({ success: true, settings: publicSettings });
  } catch (error: any) {
    console.error("GET Public Settings Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
