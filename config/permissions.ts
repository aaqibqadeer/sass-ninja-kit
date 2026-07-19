/**
 * config/permissions.ts — role → permission map (CLAUDE.md §14, Phase 4).
 *
 * A single source of truth for what each org role may do. Because authorization
 * reads this map (never a hardcoded role check scattered through the app), a fork
 * can add a new role — `manager`, `billing`, `readonly` — by adding one entry
 * here, with NO schema change (roles are stored as a free string, see
 * `lib/db/schema.ts` `roleSchema`).
 *
 * Pure and dependency-free (no db, no Next imports) so it stays trivially
 * testable and safe to import from anywhere.
 *
 * Note: this governs ORG-level roles only. Platform super-admin (§14) is a
 * separate tier checked via `requireSuperAdmin()` — never fold it in here.
 */

/** Every permission the app understands. Add new capabilities here. */
export const PERMISSIONS_LIST = [
  "org:read",
  "org:manage",
  "members:read",
  "members:invite",
  "members:remove",
  "members:updateRole",
] as const;

export type Permission = (typeof PERMISSIONS_LIST)[number];

/**
 * Role → allowed permissions. Keyed by role string so new roles slot in without
 * touching the schema. Built-in roles are `admin` and `user` (§14).
 */
export const PERMISSIONS: Record<string, readonly Permission[]> = {
  admin: [
    "org:read",
    "org:manage",
    "members:read",
    "members:invite",
    "members:remove",
    "members:updateRole",
  ],
  user: ["org:read", "members:read"],
};

/** Permissions granted to a role. Unknown roles get none (deny by default). */
export function rolePermissions(
  role: string | null | undefined,
): readonly Permission[] {
  if (!role) return [];
  return PERMISSIONS[role] ?? [];
}

/** Whether `role` is allowed to perform `permission`. */
export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  return rolePermissions(role).includes(permission);
}
