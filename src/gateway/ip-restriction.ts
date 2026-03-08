/**
 * IP-based access restriction for enterprise deployments.
 *
 * Allows administrators to restrict gateway access to specific IP ranges
 * (e.g. corporate VPN / office network) for both the Control UI and the
 * WebSocket API.
 *
 * ## Design notes (fork-upstream compatibility)
 *
 * This module is additive – it provides an `isIpAllowed` check that can be
 * called from the HTTP and WS auth paths.  The existing auth flow in
 * `auth.ts` is not modified; the restriction is an *outer guard* that runs
 * before credential checks.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type IpRestrictionConfig = {
  enabled: boolean;
  /**
   * List of allowed CIDR ranges or individual IPs.
   * Supports IPv4 and IPv6.
   * Example: `["192.168.1.0/24", "10.0.0.0/8", "::1"]`
   */
  allow: string[];
  /**
   * Optional list of denied CIDR ranges.
   * When both allow and deny match, deny takes precedence.
   */
  deny?: string[];
  /**
   * When true, requests from loopback addresses (127.0.0.1, ::1)
   * are always allowed regardless of the allow/deny lists.
   * Default: true.
   */
  allowLoopback?: boolean;
};

// ---------------------------------------------------------------------------
// CIDR matching
// ---------------------------------------------------------------------------

function parseIpv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return null;
  }
  const bytes: number[] = [];
  for (const part of parts) {
    const num = Number(part);
    if (!Number.isInteger(num) || num < 0 || num > 255) {
      return null;
    }
    bytes.push(num);
  }
  return bytes;
}

function ipv4ToNumber(bytes: number[]): number {
  return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
}

function matchesCidrV4(ip: string, cidr: string): boolean {
  const [cidrIp, prefixStr] = cidr.split("/");
  if (!cidrIp) {
    return false;
  }
  const ipBytes = parseIpv4(ip);
  const cidrBytes = parseIpv4(cidrIp);
  if (!ipBytes || !cidrBytes) {
    return false;
  }
  const prefix = prefixStr !== undefined ? Number(prefixStr) : 32;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipv4ToNumber(ipBytes) & mask) === (ipv4ToNumber(cidrBytes) & mask);
}

function normalizeIpv6(ip: string): string | null {
  // Strip IPv4-mapped prefix
  if (ip.startsWith("::ffff:")) {
    const v4 = ip.slice(7);
    if (parseIpv4(v4)) {
      return v4;
    }
  }
  // Simple normalization – expand :: and pad groups
  const halves = ip.split("::");
  if (halves.length > 2) {
    return null;
  }
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0) {
    return null;
  }
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  return groups.map((g: string) => g.padStart(4, "0").toLowerCase()).join(":");
}

function matchesCidrV6(ip: string, cidr: string): boolean {
  const [cidrIp, prefixStr] = cidr.split("/");
  if (!cidrIp) {
    return false;
  }
  const normalizedIp = normalizeIpv6(ip);
  const normalizedCidr = normalizeIpv6(cidrIp);
  if (!normalizedIp || !normalizedCidr) {
    return false;
  }
  const prefix = prefixStr !== undefined ? Number(prefixStr) : 128;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
    return false;
  }
  // Compare bit by bit via hex groups
  const ipHex = normalizedIp.replace(/:/g, "");
  const cidrHex = normalizedCidr.replace(/:/g, "");
  const fullBits = Math.floor(prefix / 4);
  if (ipHex.slice(0, fullBits) !== cidrHex.slice(0, fullBits)) {
    return false;
  }
  return true;
}

function matchesCidr(ip: string, cidr: string): boolean {
  // Try IPv4 first
  if (parseIpv4(ip) && (parseIpv4(cidr.split("/")[0]) || parseIpv4(cidr))) {
    return matchesCidrV4(ip, cidr.includes("/") ? cidr : `${cidr}/32`);
  }
  // Try IPv6
  if (ip.includes(":") || cidr.includes(":")) {
    return matchesCidrV6(ip, cidr.includes("/") ? cidr : `${cidr}/128`);
  }
  // Exact string match fallback
  return ip === cidr;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "0:0:0:0:0:0:0:1"]);

export function isLoopbackIp(ip: string): boolean {
  return LOOPBACK_ADDRESSES.has(ip);
}

/**
 * Check whether a client IP is allowed by the restriction config.
 *
 * @returns `{ allowed: true }` or `{ allowed: false, reason: string }`.
 */
export function checkIpRestriction(
  ip: string,
  config: IpRestrictionConfig,
): { allowed: true } | { allowed: false; reason: string } {
  if (!config.enabled) {
    return { allowed: true };
  }

  const allowLoopback = config.allowLoopback ?? true;
  if (allowLoopback && isLoopbackIp(ip)) {
    return { allowed: true };
  }

  // Check deny list first (deny takes precedence)
  if (config.deny) {
    for (const cidr of config.deny) {
      if (matchesCidr(ip, cidr)) {
        return { allowed: false, reason: `ip_denied:${cidr}` };
      }
    }
  }

  // Check allow list
  if (config.allow.length === 0) {
    // No allow rules = allow all (only deny rules apply)
    return { allowed: true };
  }

  for (const cidr of config.allow) {
    if (matchesCidr(ip, cidr)) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: "ip_not_in_allowlist" };
}

/**
 * Validate IP restriction configuration.
 * Returns an array of human-readable error strings (empty = valid).
 */
export function validateIpRestrictionConfig(config: IpRestrictionConfig): string[] {
  const errors: string[] = [];
  if (!config.enabled) {
    return errors;
  }
  if (!Array.isArray(config.allow)) {
    errors.push("ipRestriction.allow must be an array");
  }
  if (config.deny && !Array.isArray(config.deny)) {
    errors.push("ipRestriction.deny must be an array");
  }
  return errors;
}
