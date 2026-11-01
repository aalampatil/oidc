import { expect, test } from 'bun:test'
import { matchesCallbackIssuer, providerStorageKey, resolveProviderIssuer } from '../src/lib/providerConfig'

test('a local UI can use a production issuer without changing authentication code', () => {
  expect(resolveProviderIssuer('https://auth.example.com', true)).toBe('https://auth.example.com')
  expect(resolveProviderIssuer('https://auth.example.com', false)).toBe('https://auth.example.com')
  expect(resolveProviderIssuer(undefined, true)).toBe('http://localhost:3000')
  expect(() => resolveProviderIssuer(undefined, false)).toThrow()
})
test.each(['auth.example.com', 'http://auth.example.com', 'https://auth.example.com/#', 'https://user:secret@auth.example.com'])('rejects invalid issuer %s', (issuer) => {
  expect(() => resolveProviderIssuer(issuer, false)).toThrow()
})
test('credentials and tokens use separate storage for each exact issuer', () => {
  expect(providerStorageKey('auth', 'https://auth.example.com')).not.toBe(providerStorageKey('auth', 'http://localhost:3000'))
  expect(providerStorageKey('auth', 'https://auth.example.com')).not.toBe(providerStorageKey('auth', 'https://auth.example.com/'))
})
test('rejects callbacks from another issuer before sending client credentials', () => {
  expect(matchesCallbackIssuer('https://auth.example.com', 'https://auth.example.com', 'https://auth.example.com')).toBe(true)
  expect(matchesCallbackIssuer('https://auth.example.com', 'http://localhost:3000', null)).toBe(false)
  expect(matchesCallbackIssuer('https://auth.example.com', 'https://auth.example.com', 'https://evil.example')).toBe(false)
  expect(matchesCallbackIssuer('https://auth.example.com', 'https://auth.example.com', null)).toBe(false)
})
