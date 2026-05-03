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
export async function sendLowStockAlert(payload: LowStockAlertPayload) {
  // TODO: Integrate actual email service here
  
  console.warn("\n===========================================");
  console.warn("🔔 [LOW STOCK ALERT TRIGGERED]");
  console.warn("===========================================");
  console.warn(`Product:   ${payload.name}`);
  console.warn(`ID:        ${payload.productId}`);
  console.warn(`Available: ${payload.available}`);
  console.warn(`Threshold: ${payload.threshold}`);
  console.warn("===========================================\n");
  
  // Return true to indicate success
  return true;
}
