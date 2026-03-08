/**
 * Enterprise gateway guard – wires IP restriction, audit logging, and RBAC
 * into the request pipeline as an additive outer layer.
 *
 * ## Design notes (fork-upstream compatibility)
 *
 * This module provides a single `createEnterpriseGuard` factory that reads
 * enterprise config from `gateway.ipRestriction`, `gateway.auditLog`, and
 * `gateway.rbac`.  It returns handler functions that can be composed with
 * the existing request stages without modifying core gateway files.
 *
 * All enterprise behaviour is **opt-in**: when the relevant config section
 * is absent or `enabled: false`, the guard is a no-op passthrough.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawConfig } from "../config/config.js";
import type {
  GatewayAuditLogConfig,
  GatewayIpRestrictionConfig,
  GatewayRbacConfig,
} from "../config/types.gateway.js";
import { AuditLog, createAuditEvent, type AuditAction, type AuditLogConfig } from "./audit-log.js";
import {
  resolveUserRole,
  hasPermission,
  type RbacConfig,
  type UserRole,
  type PermissionScope,
} from "./auth-rbac.js";
import { checkIpRestriction, type IpRestrictionConfig } from "./ip-restriction.js";
import type { GatewayClient } from "./server-methods/types.js";

// ---------------------------------------------------------------------------
// IP restriction guard for HTTP requests
// ---------------------------------------------------------------------------

function resolveIpRestrictionConfig(
  cfg: GatewayIpRestrictionConfig | undefined,
): IpRestrictionConfig | null {
  if (!cfg?.enabled) {
    return null;
  }
  return {
    enabled: true,
    allow: cfg.allow ?? [],
    deny: cfg.deny,
    allowLoopback: cfg.allowLoopback,
  };
}

/**
 * Check an HTTP request against IP restriction rules.
 * Returns `true` if the request was blocked (response already sent).
 */
export function handleIpRestriction(
  req: IncomingMessage,
  res: ServerResponse,
  ipRestrictionCfg: GatewayIpRestrictionConfig | undefined,
): boolean {
  const config = resolveIpRestrictionConfig(ipRestrictionCfg);
  if (!config) {
    return false;
  }
  const clientIp = req.socket?.remoteAddress ?? "";
  if (!clientIp) {
    return false;
  }
  const result = checkIpRestriction(clientIp, config);
  if (result.allowed) {
    return false;
  }
  res.statusCode = 403;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      error: {
        message: "Access denied by IP restriction policy",
        type: "ip_restricted",
      },
    }),
  );
  return true;
}

/**
 * Check a WebSocket upgrade request against IP restriction rules.
 * Returns `true` if the connection should be rejected.
 */
export function checkWsIpRestriction(
  req: IncomingMessage,
  ipRestrictionCfg: GatewayIpRestrictionConfig | undefined,
): boolean {
  const config = resolveIpRestrictionConfig(ipRestrictionCfg);
  if (!config) {
    return false;
  }
  const clientIp = req.socket?.remoteAddress ?? "";
  if (!clientIp) {
    return false;
  }
  const result = checkIpRestriction(clientIp, config);
  return !result.allowed;
}

// ---------------------------------------------------------------------------
// Audit log singleton management
// ---------------------------------------------------------------------------

let globalAuditLog: AuditLog | null = null;

function resolveAuditLogConfig(cfg: GatewayAuditLogConfig | undefined): AuditLogConfig | null {
  if (!cfg?.enabled) {
    return null;
  }
  return {
    enabled: true,
    maxEvents: cfg.maxEvents,
    filePath: cfg.filePath,
  };
}

/**
 * Get or create the singleton AuditLog instance.
 * Returns `null` when audit logging is disabled.
 */
export function getAuditLog(cfg: GatewayAuditLogConfig | undefined): AuditLog | null {
  const config = resolveAuditLogConfig(cfg);
  if (!config) {
    return null;
  }
  if (!globalAuditLog) {
    globalAuditLog = new AuditLog(config);
  }
  return globalAuditLog;
}

/** Record an audit event if audit logging is enabled. */
export function recordAuditEvent(
  cfg: GatewayAuditLogConfig | undefined,
  params: {
    action: AuditAction;
    client: GatewayClient | null;
    target?: string;
    detail?: string;
    ok?: boolean;
    reason?: string;
  },
): void {
  const auditLog = getAuditLog(cfg);
  if (!auditLog) {
    return;
  }
  auditLog.record(createAuditEvent(params));
}

// ---------------------------------------------------------------------------
// RBAC guard for gateway methods
// ---------------------------------------------------------------------------

function resolveRbacConfig(cfg: GatewayRbacConfig | undefined): RbacConfig | null {
  if (!cfg?.enabled) {
    return null;
  }
  return {
    enabled: true,
    defaultRole: cfg.defaultRole ?? "user",
    assignments: (cfg.assignments ?? []).map((a) => ({
      userId: a.userId,
      role: a.role,
    })),
  };
}

/** Map gateway WS method names to the RBAC permission scope they require. */
const METHOD_TO_SCOPE: Record<string, PermissionScope> = {
  "config.get": "config.read",
  "config.apply": "config.write",
  "config.patch": "config.write",
  "channels.list": "channels.read",
  "channels.probe": "channels.write",
  "channels.config.save": "channels.write",
  "chat.send": "chat",
  "chat.stream": "chat",
  "sessions.list": "sessions.read",
  "sessions.create": "sessions.write",
  "sessions.delete": "sessions.write",
  "sessions.patch": "sessions.write",
  "cron.list": "cron.read",
  "cron.create": "cron.write",
  "cron.remove": "cron.write",
  "cron.toggle": "cron.write",
  "cron.run": "cron.write",
  "skills.list": "skills.read",
  "skills.install": "skills.write",
  "skills.update": "skills.write",
  "skills.toggle": "skills.write",
  "nodes.list": "nodes.read",
  "doctor.run": "debug",
};

/**
 * Check whether the current user (identified by their client identity) is
 * authorized to invoke the given gateway method under RBAC rules.
 *
 * Returns `null` if authorized, or an error message string if denied.
 */
export function checkRbacAuthorization(
  method: string,
  client: GatewayClient | null,
  rbacCfg: GatewayRbacConfig | undefined,
): string | null {
  const config = resolveRbacConfig(rbacCfg);
  if (!config) {
    return null;
  }
  // Determine user identity from the client connection
  const userId = client?.connect?.client?.id ?? client?.connect?.user ?? "";
  if (!userId) {
    // No user identity available – fall back to default role
    const defaultRole = config.defaultRole;
    const scope = METHOD_TO_SCOPE[method];
    if (scope && !hasPermission(defaultRole, scope)) {
      return `rbac: role "${defaultRole}" lacks permission "${scope}" for method "${method}"`;
    }
    return null;
  }
  const role: UserRole = resolveUserRole(userId, config);
  const scope = METHOD_TO_SCOPE[method];
  if (!scope) {
    // Method not mapped – allow (unmapped methods use upstream role-policy)
    return null;
  }
  if (!hasPermission(role, scope)) {
    return `rbac: role "${role}" lacks permission "${scope}" for method "${method}"`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Composite enterprise guard
// ---------------------------------------------------------------------------

export type EnterpriseGuardConfig = {
  ipRestriction?: GatewayIpRestrictionConfig;
  auditLog?: GatewayAuditLogConfig;
  rbac?: GatewayRbacConfig;
};

/**
 * Resolve enterprise guard config from the loaded gateway config.
 * Convenience helper so callers don't need to reach into the config tree.
 */
export function resolveEnterpriseGuardConfig(
  cfg: OpenClawConfig | undefined,
): EnterpriseGuardConfig {
  return {
    ipRestriction: cfg?.gateway?.ipRestriction,
    auditLog: cfg?.gateway?.auditLog,
    rbac: cfg?.gateway?.rbac,
  };
}
