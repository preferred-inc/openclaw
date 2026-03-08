/**
 * Role-Based Access Control (RBAC) extension for enterprise deployments.
 *
 * Extends the existing `operator` / `node` role system with finer-grained
 * user-level roles (`admin`, `user`, `viewer`) that control what a
 * *human operator* is allowed to do in the Control UI and API.
 *
 * ## Design notes (fork-upstream compatibility)
 *
 * The upstream gateway uses two *connection-level* roles: `operator` and
 * `node`.  This module adds an orthogonal *user-level* role that only
 * applies when the connection role is `operator`.  All new types live in
 * this file so the core `role-policy.ts` remains untouched and upstream
 * merges stay conflict-free.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * User-level roles for operator connections.
 *
 * - `admin`  – Full access: config changes, user management, audit log.
 * - `user`   – Normal access: chat, view channels, limited config.
 * - `viewer` – Read-only access: can view dashboards but not modify.
 */
export const USER_ROLES = ["admin", "user", "viewer"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type UserRoleAssignment = {
  /** User identifier (e-mail, login name, or device ID). */
  userId: string;
  role: UserRole;
};

export type RbacConfig = {
  enabled: boolean;
  /** Default role for authenticated users not listed in `assignments`. */
  defaultRole: UserRole;
  /** Explicit role assignments keyed by user identifier. */
  assignments: UserRoleAssignment[];
};

// ---------------------------------------------------------------------------
// Permission scopes
// ---------------------------------------------------------------------------

export const PERMISSION_SCOPES = [
  "config.read",
  "config.write",
  "channels.read",
  "channels.write",
  "chat",
  "sessions.read",
  "sessions.write",
  "users.manage",
  "audit.read",
  "cron.read",
  "cron.write",
  "nodes.read",
  "skills.read",
  "skills.write",
  "debug",
] as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<PermissionScope>> = {
  admin: new Set(PERMISSION_SCOPES),
  user: new Set([
    "config.read",
    "channels.read",
    "channels.write",
    "chat",
    "sessions.read",
    "sessions.write",
    "cron.read",
    "cron.write",
    "nodes.read",
    "skills.read",
    "skills.write",
  ] satisfies PermissionScope[]),
  viewer: new Set([
    "config.read",
    "channels.read",
    "sessions.read",
    "cron.read",
    "nodes.read",
    "skills.read",
    "audit.read",
  ] satisfies PermissionScope[]),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function parseUserRole(raw: unknown): UserRole | null {
  if (typeof raw === "string" && USER_ROLES.includes(raw as UserRole)) {
    return raw as UserRole;
  }
  return null;
}

export function resolveUserRole(userId: string, config: RbacConfig): UserRole {
  if (!config.enabled) {
    return "admin";
  }
  const assignment = config.assignments.find(
    (a) => a.userId.toLowerCase() === userId.toLowerCase(),
  );
  return assignment?.role ?? config.defaultRole;
}

export function hasPermission(role: UserRole, scope: PermissionScope): boolean {
  return ROLE_PERMISSIONS[role].has(scope);
}

export function getPermissions(role: UserRole): ReadonlySet<PermissionScope> {
  return ROLE_PERMISSIONS[role] ?? new Set();
}

/**
 * Validate RBAC configuration.
 * Returns an array of human-readable error strings (empty = valid).
 */
export function validateRbacConfig(config: RbacConfig): string[] {
  const errors: string[] = [];
  if (!config.enabled) {
    return errors;
  }
  if (!parseUserRole(config.defaultRole)) {
    errors.push(`Invalid default role: ${config.defaultRole}`);
  }
  for (const assignment of config.assignments) {
    if (!assignment.userId?.trim()) {
      errors.push("RBAC assignment missing userId");
    }
    if (!parseUserRole(assignment.role)) {
      errors.push(`Invalid role "${assignment.role}" for user "${assignment.userId}"`);
    }
  }
  return errors;
}
