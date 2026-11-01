export const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** HTTPS everywhere except explicit loopback development URLs. */
export function parseWebUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || value.includes("#") || url.hostname.includes("*")) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname))) return null;
    return url;
  } catch { return null; }
}
