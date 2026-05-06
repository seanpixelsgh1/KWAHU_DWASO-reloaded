/**
 * Pluggable notification hooks for order lifecycle events.
 * Currently uses structured logging. Replace with actual
 * SMS (Twilio/Africa's Talking) or Email (SendGrid) in the future.
 */

interface OrderNotificationPayload {
  orderId: string;
  email?: string;
  rider?: { name: string; phone: string };
}

export async function sendOrderUpdate(
  order: OrderNotificationPayload,
  status: string
) {
  switch (status) {
    case "packed":
      console.log("===========================================");
      console.log(`📦 [ORDER PACKED] Order: ${order.orderId}`);
      console.log(`   Email: ${order.email || "N/A"}`);
      console.log("===========================================");
      break;

    case "out_for_delivery":
      console.log("===========================================");
      console.log(`🚚 [ORDER DISPATCHED] Order: ${order.orderId}`);
      console.log(`   Rider: ${order.rider?.name || "N/A"}`);
      console.log(`   Phone: ${order.rider?.phone || "N/A"}`);
      console.log(`   Email: ${order.email || "N/A"}`);
      console.log("===========================================");
      break;

    case "delivered":
      console.log("===========================================");
      console.log(`🎉 [ORDER DELIVERED] Order: ${order.orderId}`);
      console.log(`   Email: ${order.email || "N/A"}`);
      console.log("===========================================");
      break;

    default:
      console.log(`ℹ️ Order ${order.orderId} updated to: ${status}`);
  }
}
