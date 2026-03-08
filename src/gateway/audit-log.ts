/**
 * Structured audit logging for enterprise deployments.
 *
 * Records *who* did *what* and *when* in a structured, append-only log that
 * can be forwarded to an external SIEM or stored locally.
 *
 * ## Design notes (fork-upstream compatibility)
 *
 * The upstream gateway already has `control-plane-audit.ts` which resolves
 * the *actor* for a gateway client.  This module builds on top of that to
 * provide a full audit event type and a pluggable sink interface.  All new
 * code lives in this file to keep upstream merges clean.
 */

import {
  resolveControlPlaneActor,
  formatControlPlaneActor,
  type ControlPlaneActor,
} from "./control-plane-audit.js";
import type { GatewayClient } from "./server-methods/types.js";

// Re-export actor utilities so consumers can use this module as single entry point.
export { resolveControlPlaneActor, formatControlPlaneActor, type ControlPlaneActor };

// ---------------------------------------------------------------------------
// Audit event types
// ---------------------------------------------------------------------------

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  | "config.read"
  | "config.write"
  | "config.apply"
  | "channel.list"
  | "channel.probe"
  | "channel.config_save"
  | "channel.whatsapp_link"
  | "channel.whatsapp_logout"
  | "chat.send"
  | "session.list"
  | "session.create"
  | "session.delete"
  | "session.patch"
  | "cron.list"
  | "cron.create"
  | "cron.toggle"
  | "cron.remove"
  | "cron.run"
  | "skill.list"
  | "skill.install"
  | "skill.update"
  | "skill.toggle"
  | "node.list"
  | "doctor.run"
  | "user.role_change"
  | "admin.ip_restriction_update";

export type AuditEvent = {
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** The action that was performed. */
  action: AuditAction;
  /** Actor who performed the action. */
  actor: ControlPlaneActor;
  /** Optional target resource identifier (e.g. channel ID, session key). */
  target?: string;
  /** Optional additional detail or diff summary. */
  detail?: string;
  /** Whether the action succeeded. */
  ok: boolean;
  /** Optional failure reason when `ok` is `false`. */
  reason?: string;
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type AuditLogConfig = {
  enabled: boolean;
  /** Maximum number of events to keep in the in-memory ring buffer. Default: 10 000. */
  maxEvents?: number;
  /** When set, events are also written to this file path (JSON Lines). */
  filePath?: string;
};

const DEFAULT_MAX_EVENTS = 10_000;

// ---------------------------------------------------------------------------
// In-memory ring buffer
// ---------------------------------------------------------------------------

export class AuditLog {
  private events: AuditEvent[] = [];
  private readonly maxEvents: number;

  constructor(config?: AuditLogConfig) {
    this.maxEvents = config?.maxEvents ?? DEFAULT_MAX_EVENTS;
  }

  /** Append an event. Oldest events are evicted when the buffer is full. */
  record(event: AuditEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /** Return recent events, newest first. */
  recent(limit = 100): AuditEvent[] {
    return this.events.slice(-limit).toReversed();
  }

  /** Query events by action type. */
  byAction(action: AuditAction, limit = 100): AuditEvent[] {
    return this.events
      .filter((e) => e.action === action)
      .slice(-limit)
      .toReversed();
  }

  /** Query events by actor identifier. */
  byActor(actorId: string, limit = 100): AuditEvent[] {
    return this.events
      .filter((e) => e.actor.actor === actorId)
      .slice(-limit)
      .toReversed();
  }

  /** Total number of recorded events. */
  get size(): number {
    return this.events.length;
  }

  /** Clear all events (useful for testing). */
  clear(): void {
    this.events = [];
  }
}

// ---------------------------------------------------------------------------
// Convenience builder
// ---------------------------------------------------------------------------

export function createAuditEvent(params: {
  action: AuditAction;
  client: GatewayClient | null;
  target?: string;
  detail?: string;
  ok?: boolean;
  reason?: string;
}): AuditEvent {
  return {
    timestamp: new Date().toISOString(),
    action: params.action,
    actor: resolveControlPlaneActor(params.client),
    target: params.target,
    detail: params.detail,
    ok: params.ok ?? true,
    reason: params.reason,
  };
}
