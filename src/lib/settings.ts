import { z } from "zod";
import { adminDb as db } from "./firebase/admin";

export const settingsSchema = z.object({
  currency: z.string(),

  store: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional()
  }),

  inventory: z.object({
    lowStockThreshold: z.number().min(0)
  }),

  features: z.object({
    enableReviews: z.boolean(),
    enableWishlist: z.boolean(),
    enableCoupons: z.boolean()
  }),

  email: z.object({
    provider: z.enum(["console", "sendgrid", "smtp"]),
    fromEmail: z.string().email()
  }),

  paystack: z.object({
    publicKey: z.string()
  })
});

export type Settings = z.infer<typeof settingsSchema>;

let cache: Settings | null = null;
let lastFetch = 0;

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - lastFetch < 60000) {
    return cache;
  }

  const doc = await db.collection("settings").doc("global").get();

  if (!doc.exists) {
    throw new Error("Settings not initialized");
  }

  const data = doc.data() as Settings;
  
  // Optional but safe check
  if (!data) {
    throw new Error("Settings not initialized");
  }

  cache = data;
  lastFetch = Date.now();

  return cache;
}

export function invalidateSettingsCache() {
  cache = null;
  lastFetch = 0;
}
