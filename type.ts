import { UserRole, OrderStatus } from "@/lib/rbac/roles";

// ─────────────────────────────────────────────
// PRODUCT (Firestore-aligned schema)
// ─────────────────────────────────────────────
export interface ProductType {
  id: string;
  name: string;
  description?: string;
  price: number; // integer (pesewas) — divide by 100 for display
  stock: number;
  reserved: number;
  images: string[];
  category?: string;
  brand?: string;
  discountPercentage?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────
// CART ITEM (lean — never trust for checkout)
// ─────────────────────────────────────────────
export interface CartItem {
  productId: string;
  quantity: number;
  // UI snapshot only — backend ignores these:
  name: string;
  image: string;
  price: number; // pesewas (display only, never sent to checkout)
}

// ─────────────────────────────────────────────
// GLOBAL STATE
// ─────────────────────────────────────────────
export interface StateType {
  kwahudwaso: {
    cart: CartItem[];
    favorite: ProductType[];
    userInfo: any;
  };
}

export interface Address {
  id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  provider?: string;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    addresses: Address[];
  };
  preferences: {
    newsletter: boolean;
    notifications: boolean;
  };
  cart: ProductType[];
  wishlist: ProductType[];
  orders: OrderData[];
}

export interface OrderData {
  id: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  trackingNumber?: string;
  assignedDeliveryman?: string;
  assignedPacker?: string;
  statusHistory: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
  deliveryDate?: string;
  packedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface OrderItem {
  productId: number;
  title: string;
  price: number;
  quantity: number;
  thumbnail: string;
  sku: string;
}

export interface OrderStatusHistory {
  status: OrderStatus;
  changedBy: string;
  changedByRole: UserRole;
  timestamp: string;
  notes?: string;
}
