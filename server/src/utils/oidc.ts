import crypto from "node:crypto";

export const SUPPORTED_SCOPES = ["openid", "email", "profile"] as const;
export const DEFAULT_SCOPE = "openid";

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function parseScopes(scope?: unknown) {
  const scopeValue = typeof scope === "string" ? scope : DEFAULT_SCOPE;
  return Array.from(
    new Set(
      scopeValue
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeScopes(scope?: unknown) {
  return parseScopes(scope).join(" ");
}

export function validateScopes(
  requestedScope: unknown,
  allowedScope: string,
) {
  const requested = parseScopes(requestedScope);
  const allowed = new Set(parseScopes(allowedScope));

  if (!requested.includes("openid")) {
    return { ok: false as const, error: "invalid_scope" };
  }

  for (const scope of requested) {
    if (
      !SUPPORTED_SCOPES.includes(scope as (typeof SUPPORTED_SCOPES)[number]) ||
      !allowed.has(scope)
    ) {
      return { ok: false as const, error: "invalid_scope" };
    }
  }

  return { ok: true as const, scope: requested.join(" ") };
}

export function validateRedirectUri(uri: unknown) {
  if (typeof uri !== "string" || uri.length > 2048) return false;

  try {
    const parsed = new URL(uri);
    if (parsed.hash) return false;
    if (!["https:", "http:"].includes(parsed.protocol)) return false;
    if (parsed.protocol === "http:" && !LOCALHOST_HOSTS.has(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function validateClientName(name: unknown) {
  return typeof name === "string" && name.trim().length >= 2 && name.length <= 100;
}

export function validateCodeChallenge(challenge: unknown, method: unknown) {
  if (method !== "S256") return false;
  if (typeof challenge !== "string") return false;
  return /^[A-Za-z0-9._~-]{43,128}$/.test(challenge);
}

export function verifyPkce(codeVerifier: unknown, codeChallenge: string) {
  if (typeof codeVerifier !== "string") return false;
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) return false;

  const digest = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return digest === codeChallenge;
}
