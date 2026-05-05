export interface LowStockAlertPayload {
  productId: string;
  name: string;
  available: number;
  threshold: number;
}

/**
 * Triggers a low stock alert notification to the admin team.
 * Currently uses structured logging, designed to be swapped with an actual
 * email provider (SendGrid, Nodemailer) in the future.
 */
import { getSettings } from "@/lib/settings";

export async function sendLowStockAlert(payload: LowStockAlertPayload) {
  const settings = await getSettings();
  
  // TODO: Integrate actual email service here based on settings.email.provider
  
  console.warn("\n===========================================");
  console.warn(`🔔 [LOW STOCK ALERT TRIGGERED - ${settings.email.provider.toUpperCase()}]`);
  console.warn(`From:      ${settings.email.fromEmail}`);
  console.warn("===========================================");
  console.warn(`Product:   ${payload.name}`);
  console.warn(`ID:        ${payload.productId}`);
  console.warn(`Available: ${payload.available}`);
  console.warn(`Threshold: ${payload.threshold}`);
  console.warn("===========================================\n");
  
  // Return true to indicate success
  return true;
}
