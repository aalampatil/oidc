import { expect, test } from 'bun:test'
import config from '../vite.config'

test('production builds reject a schemeless issuer before emitting a blank-page release', async () => {
  const previous = process.env.VITE_API_BASE_URL
  try {
    process.env.VITE_API_BASE_URL = 'oidc-server.aalampatil.online'
    expect(typeof config).toBe('function')
    if (typeof config !== 'function') throw new Error('Expected Vite configuration factory')
    expect(() => config({ command: 'build', mode: 'production' })).toThrow('absolute OIDC issuer URL')
    process.env.VITE_API_BASE_URL = 'https://oidc-server.aalampatil.online'
    expect(() => config({ command: 'build', mode: 'production' })).not.toThrow()
  } finally {
    if (previous === undefined) delete process.env.VITE_API_BASE_URL
    else process.env.VITE_API_BASE_URL = previous
  }
})
