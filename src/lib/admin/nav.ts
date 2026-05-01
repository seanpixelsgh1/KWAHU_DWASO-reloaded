import {
  FiGrid,
  FiShoppingBag,
  FiPackage,
  FiLayers,
  FiCreditCard,
  FiUsers,
  FiTrendingUp,
  FiSettings,
} from "react-icons/fi";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const adminNav: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: FiGrid },
  { name: "Orders", href: "/admin/orders", icon: FiShoppingBag },
  { name: "Products", href: "/admin/products", icon: FiPackage },
  { name: "Inventory", href: "/admin/inventory", icon: FiLayers },
  { name: "Payments", href: "/admin/payments", icon: FiCreditCard },
  { name: "Users", href: "/admin/users", icon: FiUsers },
  { name: "Analytics", href: "/admin/analytics", icon: FiTrendingUp },
  { name: "Settings", href: "/admin/settings", icon: FiSettings },
];
