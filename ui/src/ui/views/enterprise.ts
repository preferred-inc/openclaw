import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RbacAssignment = {
  userId: string;
  role: "admin" | "user" | "viewer";
};

export type AuditEventEntry = {
  timestamp: string;
  action: string;
  actor: { actor: string; role?: string; source?: string };
  target?: string;
  detail?: string;
  ok: boolean;
  reason?: string;
};

export type EnterpriseProps = {
  // RBAC
  rbacEnabled: boolean;
  rbacDefaultRole: string;
  rbacAssignments: RbacAssignment[];
  rbacEditUserId: string;
  rbacEditRole: string;
  onRbacEditUserIdChange: (value: string) => void;
  onRbacEditRoleChange: (value: string) => void;
  onRbacAddAssignment: () => void;
  onRbacRemoveAssignment: (userId: string) => void;

  // Audit log
  auditEnabled: boolean;
  auditEvents: AuditEventEntry[];
  auditLoading: boolean;
  auditFilterAction: string;
  onAuditFilterActionChange: (value: string) => void;
  onAuditRefresh: () => void;

  // IP restriction
  ipRestrictionEnabled: boolean;
  ipAllowList: string[];
  ipDenyList: string[];
  ipAllowLoopback: boolean;
  ipEditValue: string;
  ipEditMode: "allow" | "deny";
  onIpEditValueChange: (value: string) => void;
  onIpEditModeChange: (mode: "allow" | "deny") => void;
  onIpAddRule: () => void;
  onIpRemoveRule: (mode: "allow" | "deny", value: string) => void;

  // SSO
  ssoEnabled: boolean;
  ssoProtocol: string;
  ssoSpEntityId: string;
  ssoCallbackPath: string;
  ssoEntryPoint: string;
  ssoIssuer: string;
  ssoAllowedDomains: string[];

  // General
  connected: boolean;
};

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

function renderRbacSection(props: EnterpriseProps) {
  const roleOptions = ["admin", "user", "viewer"];

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${t("enterprise.rbac.title")}</div>
          <div class="card-sub">${t("enterprise.rbac.subtitle")}</div>
        </div>
        <div class="pill ${props.rbacEnabled ? "success" : ""}">
          ${props.rbacEnabled ? t("common.enabled") : t("common.disabled")}
        </div>
      </div>

      ${
        props.rbacEnabled
          ? html`
          <div class="stat-grid" style="margin-top: 16px;">
            <div class="stat">
              <div class="stat-label">${t("enterprise.rbac.defaultRole")}</div>
              <div class="stat-value">${props.rbacDefaultRole}</div>
            </div>
            <div class="stat">
              <div class="stat-label">${t("enterprise.rbac.assignmentCount")}</div>
              <div class="stat-value">${props.rbacAssignments.length}</div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <div class="muted" style="margin-bottom: 8px;">${t("enterprise.rbac.assignments")}</div>
            ${
              props.rbacAssignments.length === 0
                ? html`<div class="muted">${t("enterprise.rbac.noAssignments")}</div>`
                : html`
                <div class="list">
                  ${props.rbacAssignments.map(
                    (a) => html`
                      <div class="list-item">
                        <div class="list-main">
                          <div class="list-title">${a.userId}</div>
                          <div class="list-sub">
                            <span class="pill ${a.role === "admin" ? "danger" : a.role === "viewer" ? "" : "warn"}">${a.role}</span>
                          </div>
                        </div>
                        <button
                          class="btn btn--sm"
                          @click=${() => props.onRbacRemoveAssignment(a.userId)}
                        >${t("enterprise.rbac.remove")}</button>
                      </div>
                    `,
                  )}
                </div>
              `
            }
          </div>

          <div class="form-grid" style="margin-top: 16px;">
            <label class="field">
              <span>${t("enterprise.rbac.userId")}</span>
              <input
                .value=${props.rbacEditUserId}
                @input=${(e: Event) => props.onRbacEditUserIdChange((e.target as HTMLInputElement).value)}
                placeholder=${t("enterprise.rbac.userIdPlaceholder")}
              />
            </label>
            <label class="field">
              <span>${t("enterprise.rbac.role")}</span>
              <select
                .value=${props.rbacEditRole}
                @change=${(e: Event) => props.onRbacEditRoleChange((e.target as HTMLSelectElement).value)}
              >
                ${roleOptions.map((role) => html`<option value=${role}>${role}</option>`)}
              </select>
            </label>
          </div>
          <div class="row" style="margin-top: 12px;">
            <button
              class="btn primary"
              ?disabled=${!props.rbacEditUserId.trim()}
              @click=${props.onRbacAddAssignment}
            >${t("enterprise.rbac.addAssignment")}</button>
          </div>
        `
          : html`
          <div class="callout" style="margin-top: 14px;">
            ${t("enterprise.rbac.disabledHint")}
          </div>
        `
      }
    </section>
  `;
}

function renderAuditSection(props: EnterpriseProps) {
  const actionFilters = [
    "",
    "auth.login",
    "auth.logout",
    "config.read",
    "config.write",
    "config.apply",
    "channel.probe",
    "chat.send",
    "session.create",
    "session.delete",
    "cron.create",
    "cron.toggle",
    "skill.install",
  ];

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${t("enterprise.audit.title")}</div>
          <div class="card-sub">${t("enterprise.audit.subtitle")}</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="pill ${props.auditEnabled ? "success" : ""}">
            ${props.auditEnabled ? t("common.enabled") : t("common.disabled")}
          </div>
          ${
            props.auditEnabled
              ? html`<button class="btn btn--sm" ?disabled=${props.auditLoading} @click=${props.onAuditRefresh}>
                ${props.auditLoading ? t("enterprise.audit.loading") : t("common.refresh")}
              </button>`
              : nothing
          }
        </div>
      </div>

      ${
        props.auditEnabled
          ? html`
          <div class="form-grid" style="margin-top: 16px;">
            <label class="field">
              <span>${t("enterprise.audit.filterAction")}</span>
              <select
                .value=${props.auditFilterAction}
                @change=${(e: Event) => props.onAuditFilterActionChange((e.target as HTMLSelectElement).value)}
              >
                ${actionFilters.map(
                  (action) =>
                    html`<option value=${action}>${action || t("enterprise.audit.allActions")}</option>`,
                )}
              </select>
            </label>
          </div>

          ${
            props.auditEvents.length === 0
              ? html`<div class="muted" style="margin-top: 14px;">${t("enterprise.audit.noEvents")}</div>`
              : html`
              <div class="list" style="margin-top: 14px; max-height: 400px; overflow-y: auto;">
                ${props.auditEvents.map(
                  (evt) => html`
                    <div class="list-item">
                      <div class="list-main">
                        <div class="list-title">
                          <span class="mono">${evt.action}</span>
                          <span class="pill ${evt.ok ? "success" : "danger"}" style="margin-left: 6px;">
                            ${evt.ok ? "OK" : "DENIED"}
                          </span>
                        </div>
                        <div class="list-sub">
                          ${evt.actor.actor}
                          ${evt.target ? html` &rarr; <span class="mono">${evt.target}</span>` : nothing}
                        </div>
                        <div class="list-sub muted">
                          ${new Date(evt.timestamp).toLocaleString()}
                          ${evt.reason ? html` &mdash; ${evt.reason}` : nothing}
                        </div>
                      </div>
                    </div>
                  `,
                )}
              </div>
            `
          }
        `
          : html`
          <div class="callout" style="margin-top: 14px;">
            ${t("enterprise.audit.disabledHint")}
          </div>
        `
      }
    </section>
  `;
}

function renderIpRestrictionSection(props: EnterpriseProps) {
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${t("enterprise.ip.title")}</div>
          <div class="card-sub">${t("enterprise.ip.subtitle")}</div>
        </div>
        <div class="pill ${props.ipRestrictionEnabled ? "success" : ""}">
          ${props.ipRestrictionEnabled ? t("common.enabled") : t("common.disabled")}
        </div>
      </div>

      ${
        props.ipRestrictionEnabled
          ? html`
          <div class="stat-grid" style="margin-top: 16px;">
            <div class="stat">
              <div class="stat-label">${t("enterprise.ip.allowRules")}</div>
              <div class="stat-value">${props.ipAllowList.length}</div>
            </div>
            <div class="stat">
              <div class="stat-label">${t("enterprise.ip.denyRules")}</div>
              <div class="stat-value">${props.ipDenyList.length}</div>
            </div>
            <div class="stat">
              <div class="stat-label">${t("enterprise.ip.loopback")}</div>
              <div class="stat-value">${props.ipAllowLoopback ? t("channels.status.yes") : t("channels.status.no")}</div>
            </div>
          </div>

          <div style="margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <div class="muted" style="margin-bottom: 8px;">${t("enterprise.ip.allowListTitle")}</div>
              ${
                props.ipAllowList.length === 0
                  ? html`<div class="muted">${t("enterprise.ip.noRules")}</div>`
                  : html`
                  <div class="list">
                    ${props.ipAllowList.map(
                      (ip) => html`
                        <div class="list-item">
                          <div class="list-main">
                            <div class="list-title mono">${ip}</div>
                          </div>
                          <button class="btn btn--sm" @click=${() => props.onIpRemoveRule("allow", ip)}>
                            ${t("enterprise.rbac.remove")}
                          </button>
                        </div>
                      `,
                    )}
                  </div>
                `
              }
            </div>
            <div>
              <div class="muted" style="margin-bottom: 8px;">${t("enterprise.ip.denyListTitle")}</div>
              ${
                props.ipDenyList.length === 0
                  ? html`<div class="muted">${t("enterprise.ip.noRules")}</div>`
                  : html`
                  <div class="list">
                    ${props.ipDenyList.map(
                      (ip) => html`
                        <div class="list-item">
                          <div class="list-main">
                            <div class="list-title mono">${ip}</div>
                          </div>
                          <button class="btn btn--sm" @click=${() => props.onIpRemoveRule("deny", ip)}>
                            ${t("enterprise.rbac.remove")}
                          </button>
                        </div>
                      `,
                    )}
                  </div>
                `
              }
            </div>
          </div>

          <div class="form-grid" style="margin-top: 16px;">
            <label class="field">
              <span>${t("enterprise.ip.cidrOrIp")}</span>
              <input
                .value=${props.ipEditValue}
                @input=${(e: Event) => props.onIpEditValueChange((e.target as HTMLInputElement).value)}
                placeholder="192.168.1.0/24"
              />
            </label>
            <label class="field">
              <span>${t("enterprise.ip.ruleType")}</span>
              <select
                .value=${props.ipEditMode}
                @change=${(e: Event) => props.onIpEditModeChange((e.target as HTMLSelectElement).value as "allow" | "deny")}
              >
                <option value="allow">${t("enterprise.ip.allow")}</option>
                <option value="deny">${t("enterprise.ip.deny")}</option>
              </select>
            </label>
          </div>
          <div class="row" style="margin-top: 12px;">
            <button
              class="btn primary"
              ?disabled=${!props.ipEditValue.trim()}
              @click=${props.onIpAddRule}
            >${t("enterprise.ip.addRule")}</button>
          </div>
        `
          : html`
          <div class="callout" style="margin-top: 14px;">
            ${t("enterprise.ip.disabledHint")}
          </div>
        `
      }
    </section>
  `;
}

function renderSsoSection(props: EnterpriseProps) {
  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${t("enterprise.sso.title")}</div>
          <div class="card-sub">${t("enterprise.sso.subtitle")}</div>
        </div>
        <div class="pill ${props.ssoEnabled ? "success" : ""}">
          ${props.ssoEnabled ? t("common.enabled") : t("common.disabled")}
        </div>
      </div>

      ${
        props.ssoEnabled
          ? html`
          <div class="stat-grid" style="margin-top: 16px;">
            <div class="stat">
              <div class="stat-label">${t("enterprise.sso.protocol")}</div>
              <div class="stat-value">${props.ssoProtocol.toUpperCase()}</div>
            </div>
            <div class="stat">
              <div class="stat-label">${t("enterprise.sso.spEntityId")}</div>
              <div class="stat-value mono" style="font-size: 12px; word-break: break-all;">${props.ssoSpEntityId}</div>
            </div>
            <div class="stat">
              <div class="stat-label">${t("enterprise.sso.callbackPath")}</div>
              <div class="stat-value mono" style="font-size: 12px;">${props.ssoCallbackPath}</div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <div class="muted" style="margin-bottom: 8px;">${t("enterprise.sso.idpConfig")}</div>
            <div class="stat-grid">
              <div class="stat">
                <div class="stat-label">${t("enterprise.sso.entryPoint")}</div>
                <div class="stat-value mono" style="font-size: 12px; word-break: break-all;">
                  ${props.ssoEntryPoint || t("common.na")}
                </div>
              </div>
              <div class="stat">
                <div class="stat-label">${t("enterprise.sso.issuer")}</div>
                <div class="stat-value mono" style="font-size: 12px;">
                  ${props.ssoIssuer || t("common.na")}
                </div>
              </div>
            </div>
          </div>

          ${
            props.ssoAllowedDomains.length > 0
              ? html`
              <div style="margin-top: 16px;">
                <div class="muted" style="margin-bottom: 8px;">${t("enterprise.sso.allowedDomains")}</div>
                <div class="row" style="gap: 6px; flex-wrap: wrap;">
                  ${props.ssoAllowedDomains.map(
                    (domain) => html`<span class="pill">${domain}</span>`,
                  )}
                </div>
              </div>
            `
              : nothing
          }
        `
          : html`
          <div class="callout" style="margin-top: 14px;">
            ${t("enterprise.sso.disabledHint")}
          </div>
        `
      }
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

export function renderEnterprise(props: EnterpriseProps) {
  return html`
    <section class="grid grid-cols-2">
      ${renderRbacSection(props)}
      ${renderAuditSection(props)}
    </section>
    <section class="grid grid-cols-2" style="margin-top: 18px;">
      ${renderIpRestrictionSection(props)}
      ${renderSsoSection(props)}
    </section>
  `;
}
