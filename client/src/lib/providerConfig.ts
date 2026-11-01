export function resolveProviderIssuer(configured: string | undefined, development: boolean): string {
  const issuer = configured?.trim() || (development ? 'http://localhost:3000' : '')
  if (!issuer) throw new Error('Set VITE_API_BASE_URL to the public OIDC issuer before building for production.')
  let url: URL
  try { url = new URL(issuer) } catch { throw new Error('VITE_API_BASE_URL must be an absolute OIDC issuer URL.') }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.username || url.password || url.hostname.includes('*') || issuer.includes('?') || issuer.includes('#') || /[\u0000-\u0020\u007f]/.test(issuer) ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) {
    throw new Error('The OIDC issuer must use HTTPS, except for loopback development, and must not contain credentials, a query, or a fragment.')
  }
  return issuer
}

export const providerStorageKey = (name: string, issuer: string) => `${name}:${encodeURIComponent(issuer)}`

export function matchesCallbackIssuer(expected: string, current: string, response: string | null) {
  return expected === current && response === expected
}
