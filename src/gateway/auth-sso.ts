/**
 * SSO / SAML authentication foundation for enterprise deployments.
 *
 * This module defines the configuration types and helper utilities needed to
 * integrate an external Identity Provider (IdP) with the OpenClaw gateway.
 * The actual SAML XML handling is intentionally deferred to a future
 * implementation so that the gateway can stay lean and the IdP library
 * dependency is only pulled in when SSO is enabled.
 *
 * ## Design notes (fork-upstream compatibility)
 *
 * All SSO-related configuration lives under `gateway.auth.sso` in the YAML
 * config.  The existing `ResolvedGatewayAuth` flow in `auth.ts` is left
 * untouched; SSO is an *additional* auth method that is checked before the
 * legacy token/password path when `sso.enabled` is `true`.
 */

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

/** Supported SSO protocol. Only SAML 2.0 for now; OIDC may follow. */
export type SsoProtocol = "saml";

export type SamlIdpConfig = {
  /** IdP SSO endpoint (HTTP-Redirect binding). */
  entryPoint: string;
  /** IdP certificate (PEM) used to verify SAML assertions. */
  cert: string;
  /** Optional IdP issuer / entityID for validation. */
  issuer?: string;
};

export type SsoConfig = {
  enabled: boolean;
  protocol: SsoProtocol;
  /** Service Provider entityID – usually the gateway's public URL. */
  spEntityId: string;
  /** ACS (Assertion Consumer Service) callback path. Default: `/__openclaw/auth/sso/callback` */
  callbackPath?: string;
  /** SAML-specific IdP settings. */
  saml?: SamlIdpConfig;
  /** Attribute name that carries the user's e-mail / login. Default: `email`. */
  userAttribute?: string;
  /** Optional list of allowed domains. Empty = allow all. */
  allowedDomains?: string[];
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const SSO_DEFAULT_CALLBACK_PATH = "/__openclaw/auth/sso/callback";
export const SSO_DEFAULT_USER_ATTRIBUTE = "email";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function resolveSsoCallbackPath(config: SsoConfig): string {
  return config.callbackPath?.trim() || SSO_DEFAULT_CALLBACK_PATH;
}

export function resolveSsoUserAttribute(config: SsoConfig): string {
  return config.userAttribute?.trim() || SSO_DEFAULT_USER_ATTRIBUTE;
}

/**
 * Validate that the SSO config has the minimum required fields.
 * Returns an array of human-readable error strings (empty = valid).
 */
export function validateSsoConfig(config: SsoConfig): string[] {
  const errors: string[] = [];
  if (!config.enabled) {
    return errors;
  }
  if (config.protocol !== "saml") {
    errors.push(`Unsupported SSO protocol: ${String(config.protocol)}`);
    return errors;
  }
  if (!config.spEntityId?.trim()) {
    errors.push("sso.spEntityId is required");
  }
  if (!config.saml) {
    errors.push("sso.saml config block is required when protocol is saml");
    return errors;
  }
  if (!config.saml.entryPoint?.trim()) {
    errors.push("sso.saml.entryPoint is required");
  }
  if (!config.saml.cert?.trim()) {
    errors.push("sso.saml.cert is required");
  }
  return errors;
}

/**
 * Check whether an authenticated SSO user belongs to an allowed domain.
 * Returns `true` when `allowedDomains` is empty (all domains allowed).
 */
export function isSsoDomainAllowed(email: string, allowedDomains?: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return false;
  }
  return allowedDomains.some((d) => d.toLowerCase() === domain);
}
