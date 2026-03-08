import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";

export type AuditEventRow = {
  timestamp: string;
  action: string;
  actor: string;
  actorRole: string;
  target: string | null;
  detail: string | null;
  ok: boolean;
  reason: string | null;
};

export type AuditLogProps = {
  loading: boolean;
  events: AuditEventRow[];
  total: number;
  filterAction: string;
  filterActor: string;
  limit: number;
  onRefresh: () => void;
  onFilterActionChange: (action: string) => void;
  onFilterActorChange: (actor: string) => void;
  onLimitChange: (limit: number) => void;
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function uniqueValues(events: AuditEventRow[], key: "action" | "actor"): string[] {
  const set = new Set<string>();
  for (const e of events) {
    const v = e[key];
    if (v) {
      set.add(v);
    }
  }
  return [...set].toSorted();
}

export function renderAuditLog(props: AuditLogProps) {
  const actions = uniqueValues(props.events, "action");
  const actors = uniqueValues(props.events, "actor");

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${t("auditLog.title")}</div>
          <div class="card-sub">${t("auditLog.subtitle")}</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? t("actions.loading") : t("actions.refresh")}
        </button>
      </div>

      <div class="callout" style="margin-top: 12px;">
        ${t("auditLog.memoryOnly")}
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field">
          <span>${t("auditLog.filterByAction")}</span>
          <select
            .value=${props.filterAction}
            @change=${(e: Event) =>
              props.onFilterActionChange((e.target as HTMLSelectElement).value)}
          >
            <option value="">${t("auditLog.allActions")}</option>
            ${actions.map(
              (a) => html`<option value=${a} ?selected=${props.filterAction === a}>${a}</option>`,
            )}
          </select>
        </label>
        <label class="field">
          <span>${t("auditLog.filterByActor")}</span>
          <select
            .value=${props.filterActor}
            @change=${(e: Event) =>
              props.onFilterActorChange((e.target as HTMLSelectElement).value)}
          >
            <option value="">${t("auditLog.allActors")}</option>
            ${actors.map(
              (a) => html`<option value=${a} ?selected=${props.filterActor === a}>${a}</option>`,
            )}
          </select>
        </label>
      </div>

      <div class="muted" style="margin-top: 12px;">
        ${t("auditLog.totalEvents").replace("{count}", String(props.total))}
      </div>

      <div class="table" style="margin-top: 16px;">
        <div class="table-head">
          <div>${t("auditLog.columns.timestamp")}</div>
          <div>${t("auditLog.columns.action")}</div>
          <div>${t("auditLog.columns.actor")}</div>
          <div>${t("auditLog.columns.target")}</div>
          <div>${t("auditLog.columns.status")}</div>
          <div>${t("auditLog.columns.reason")}</div>
        </div>
        ${
          props.events.length === 0
            ? html`
                <div class="muted" style="padding: 12px;">${t("auditLog.noEvents")}</div>
              `
            : props.events.map(
                (event) => html`
                  <div class="table-row">
                    <div class="mono" style="font-size: 0.85em;">
                      ${formatTimestamp(event.timestamp)}
                    </div>
                    <div>
                      <span class="chip">${event.action}</span>
                    </div>
                    <div class="mono">${event.actor}</div>
                    <div class="mono">${event.target ?? ""}</div>
                    <div>
                      <span class="chip ${event.ok ? "chip-ok" : "chip-warn"}">
                        ${event.ok ? t("auditLog.status.success") : t("auditLog.status.failure")}
                      </span>
                    </div>
                    <div>${event.reason ?? ""}</div>
                  </div>
                `,
              )
        }
      </div>

      ${
        props.events.length > 0 && props.events.length >= props.limit
          ? html`
            <div style="margin-top: 12px; text-align: center;">
              <button
                class="btn"
                @click=${() => props.onLimitChange(props.limit + 100)}
              >
                ${t("actions.loading").replace(/…$/, "")} more
              </button>
            </div>
          `
          : nothing
      }
    </section>
  `;
}
