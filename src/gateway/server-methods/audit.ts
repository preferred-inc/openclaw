import { loadConfig } from "../../config/config.js";
import { getAuditLog } from "../enterprise-guard.js";
import type { GatewayRequestHandlers } from "./types.js";

export const auditHandlers: GatewayRequestHandlers = {
  "audit.list": (opts) => {
    const { params, respond } = opts;
    const cfg = loadConfig();
    const auditLog = getAuditLog(cfg.gateway?.auditLog);
    if (!auditLog) {
      respond(true, { events: [], total: 0 });
      return;
    }

    const limit =
      typeof params.limit === "number" && params.limit > 0 ? Math.min(params.limit, 500) : 100;
    const action =
      typeof params.action === "string" && params.action.trim() ? params.action.trim() : undefined;
    const actor =
      typeof params.actor === "string" && params.actor.trim() ? params.actor.trim() : undefined;

    let events;
    if (action && actor) {
      events = auditLog
        .byAction(action as import("../audit-log.js").AuditAction, limit)
        .filter((e) => e.actor.actor === actor);
    } else if (action) {
      events = auditLog.byAction(action as import("../audit-log.js").AuditAction, limit);
    } else if (actor) {
      events = auditLog.byActor(actor, limit);
    } else {
      events = auditLog.recent(limit);
    }

    // Serialize events for the client
    const serialized = events.map((e) => ({
      timestamp: e.timestamp,
      action: e.action,
      actor: e.actor.actor,
      actorRole: e.actor.role,
      target: e.target ?? null,
      detail: e.detail ?? null,
      ok: e.ok,
      reason: e.reason ?? null,
    }));

    respond(true, { events: serialized, total: auditLog.size });
  },
};
