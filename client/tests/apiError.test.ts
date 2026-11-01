import { describe, expect, test } from 'bun:test'
import { AxiosError } from 'axios'
import { getApiErrorMessage } from '../src/lib/apiError'

const responseError = (data: unknown) => Object.assign(new AxiosError('Request failed'), { response: { data } })

describe('API error presentation', () => {
  test('never displays the HTML database error page', () => {
    const error = responseError('<!DOCTYPE html><pre>Failed query: insert into oauth_clients secret-value</pre>')
    expect(getApiErrorMessage(error, 'Registration unavailable.')).toBe('Registration unavailable.')
  })
  test('preserves actionable JSON messages and OAuth error codes', () => {
    expect(getApiErrorMessage(responseError({ message: 'Database needs setup.' }), 'Failed')).toBe('Database needs setup.')
    expect(getApiErrorMessage(responseError({ error: 'invalid_grant' }), 'Failed')).toBe('invalid_grant')
  })
  test('handles offline requests and unexpected response shapes', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'), 'Server unavailable.')).toBe('Server unavailable.')
    expect(getApiErrorMessage(responseError({ message: { nested: true } }), 'Failed')).toBe('Failed')
  })
})
