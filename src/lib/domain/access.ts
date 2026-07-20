export type AppRole = "ADMIN" | "MANAGER" | "CASHIER" | "USER";

export type Permission =
  | "documents:submit"
  | "documents:approve"
  | "inventory:manage"
  | "sales:create"
  | "sales:override"
  | "reports:view"
  | "settings:manage"
  | "users:manage";

const PERMISSIONS: Record<AppRole, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([
    "documents:submit",
    "documents:approve",
    "inventory:manage",
    "sales:create",
    "sales:override",
    "reports:view",
    "settings:manage",
    "users:manage",
  ]),
  MANAGER: new Set<Permission>([
    "documents:submit",
    "documents:approve",
    "inventory:manage",
    "sales:create",
    "sales:override",
    "reports:view",
  ]),
  CASHIER: new Set<Permission>(["documents:submit", "sales:create"]),
  USER: new Set<Permission>(),
};

export function can(role: AppRole | null | undefined, permission: Permission) {
  return role ? PERMISSIONS[role].has(permission) : false;
}
