import type { GatewayBrowserClient } from "../gateway.ts";
import type { AuditEventRow } from "../views/audit-log.ts";

export type AuditState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  auditLoading: boolean;
  auditEvents: AuditEventRow[];
  auditTotal: number;
  auditFilterAction: string;
  auditFilterActor: string;
  auditLimit: number;
};

export async function loadAuditLog(state: AuditState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.auditLoading) {
    return;
  }
  state.auditLoading = true;
  try {
    const params: Record<string, unknown> = { limit: state.auditLimit };
    if (state.auditFilterAction) {
      params.action = state.auditFilterAction;
    }
    if (state.auditFilterActor) {
      params.actor = state.auditFilterActor;
    }
    const res = await state.client.request("audit.list", params);
    state.auditEvents = res.events ?? [];
    state.auditTotal = res.total ?? 0;
  } catch {
    state.auditEvents = [];
    state.auditTotal = 0;
  } finally {
    state.auditLoading = false;
  }
}
