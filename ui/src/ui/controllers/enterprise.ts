import type { GatewayBrowserClient } from "../gateway.ts";
import type { AuditEventEntry, RbacAssignment } from "../views/enterprise.ts";

export type EnterpriseState = {
  client: GatewayBrowserClient | null;
  connected: boolean;

  // RBAC
  enterpriseRbacEnabled: boolean;
  enterpriseRbacDefaultRole: string;
  enterpriseRbacAssignments: RbacAssignment[];
  enterpriseRbacEditUserId: string;
  enterpriseRbacEditRole: string;

  // Audit
  enterpriseAuditEnabled: boolean;
  enterpriseAuditEvents: AuditEventEntry[];
  enterpriseAuditLoading: boolean;
  enterpriseAuditFilterAction: string;

  // IP restriction
  enterpriseIpEnabled: boolean;
  enterpriseIpAllowList: string[];
  enterpriseIpDenyList: string[];
  enterpriseIpAllowLoopback: boolean;
  enterpriseIpEditValue: string;
  enterpriseIpEditMode: "allow" | "deny";

  // SSO
  enterpriseSsoEnabled: boolean;
  enterpriseSsoProtocol: string;
  enterpriseSsoSpEntityId: string;
  enterpriseSsoCallbackPath: string;
  enterpriseSsoEntryPoint: string;
  enterpriseSsoIssuer: string;
  enterpriseSsoAllowedDomains: string[];
};

/**
 * Load enterprise configuration from the gateway status snapshot.
 * Populates RBAC, IP restriction, and SSO state from the config.
 */
export function loadEnterpriseConfig(state: EnterpriseState, snapshot: unknown): void {
  const cfg = snapshot as {
    gateway?: {
      rbac?: {
        enabled?: boolean;
        defaultRole?: string;
        assignments?: Record<string, string>;
      };
      auditLog?: {
        enabled?: boolean;
      };
      ipRestriction?: {
        enabled?: boolean;
        allow?: string[];
        deny?: string[];
        allowLoopback?: boolean;
      };
      auth?: {
        sso?: {
          enabled?: boolean;
          protocol?: string;
          spEntityId?: string;
          callbackPath?: string;
          saml?: {
            entryPoint?: string;
            issuer?: string;
          };
          allowedDomains?: string[];
        };
      };
    };
  };

  const rbac = cfg?.gateway?.rbac;
  state.enterpriseRbacEnabled = rbac?.enabled ?? false;
  state.enterpriseRbacDefaultRole = rbac?.defaultRole ?? "viewer";
  if (rbac?.assignments) {
    state.enterpriseRbacAssignments = Object.entries(rbac.assignments).map(([userId, role]) => ({
      userId,
      role: role as "admin" | "user" | "viewer",
    }));
  }

  const audit = cfg?.gateway?.auditLog;
  state.enterpriseAuditEnabled = audit?.enabled ?? false;

  const ip = cfg?.gateway?.ipRestriction;
  state.enterpriseIpEnabled = ip?.enabled ?? false;
  state.enterpriseIpAllowList = ip?.allow ?? [];
  state.enterpriseIpDenyList = ip?.deny ?? [];
  state.enterpriseIpAllowLoopback = ip?.allowLoopback ?? true;

  const sso = cfg?.gateway?.auth?.sso;
  state.enterpriseSsoEnabled = sso?.enabled ?? false;
  state.enterpriseSsoProtocol = sso?.protocol ?? "saml";
  state.enterpriseSsoSpEntityId = sso?.spEntityId ?? "";
  state.enterpriseSsoCallbackPath = sso?.callbackPath ?? "/__openclaw/auth/sso/callback";
  state.enterpriseSsoEntryPoint = sso?.saml?.entryPoint ?? "";
  state.enterpriseSsoIssuer = sso?.saml?.issuer ?? "";
  state.enterpriseSsoAllowedDomains = sso?.allowedDomains ?? [];
}

/**
 * Load audit log events from the gateway via RPC.
 */
export async function loadEnterpriseAudit(state: EnterpriseState): Promise<void> {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.enterpriseAuditLoading) {
    return;
  }
  state.enterpriseAuditLoading = true;
  try {
    const filter = state.enterpriseAuditFilterAction
      ? { action: state.enterpriseAuditFilterAction }
      : {};
    const res = await state.client.request<{ events?: AuditEventEntry[] }>(
      "enterprise.audit.list",
      { limit: 200, ...filter },
    );
    state.enterpriseAuditEvents = res?.events ?? [];
  } catch {
    // Gateway may not support this method yet – silently ignore
    state.enterpriseAuditEvents = [];
  } finally {
    state.enterpriseAuditLoading = false;
  }
}
