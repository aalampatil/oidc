import axios from 'axios'

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback
  const data: unknown = error.response?.data
  // Legacy servers and proxies may return HTML containing SQL and stack traces.
  if (!data || typeof data !== 'object') return fallback
  const response = data as { message?: unknown; error?: unknown }
  if (typeof response.message === 'string') return response.message
  if (typeof response.error === 'string') return response.error
  return fallback
}
