import type { Role } from "@/generated/prisma/enums";

export type Permission =
  | "admin:access"
  | "admin:users"
  | "admin:sellers"
  | "admin:catalog"
  | "admin:orders"
  | "admin:finance"
  | "admin:platform"
  | "seller:access"
  | "seller:shop"
  | "seller:products"
  | "seller:orders"
  | "seller:payouts"
  | "account:access";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: [
    "admin:access",
    "admin:users",
    "admin:sellers",
    "admin:catalog",
    "admin:orders",
    "admin:finance",
    "admin:platform",
    "seller:access",
    "account:access",
  ],
  SELLER: ["seller:access", "seller:shop", "seller:products", "seller:orders", "seller:payouts", "account:access"],
  CUSTOMER: ["account:access"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "SELLER":
      return "/seller";
    default:
      return "/";
  }
}
