import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { emailVerification } from '@/services/emailVerification'
import { getApiErrorMessage } from '@/lib/apiError'

export function useEmailVerification(initialRetryAfter = 0) {
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [retryAt, setRetryAt] = useState(() => Date.now() + initialRetryAfter * 1000)
  const [secondsLeft, setSecondsLeft] = useState(initialRetryAfter)
  const inFlight = useRef(false)

  useEffect(() => {
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [retryAt])

  async function run(action: 'send' | 'verify', email: string, code?: string) {
    if (inFlight.current || (action === 'send' && Date.now() < retryAt)) return false
    inFlight.current = true
    setBusy(action)
    setError(null)
    setMessage(null)
    try {
      const result = action === 'send' ? await emailVerification.send(email) : await emailVerification.verify(email, code!)
      if (action === 'send') setRetryAt(Date.now() + (result.retryAfter ?? 60) * 1000)
      setMessage(result.message)
      return true
    } catch (error) {
      const delay = axios.isAxiosError(error) ? Number(error.response?.data?.retryAfter ?? error.response?.headers['retry-after']) : 0
      if (action === 'send' && Number.isFinite(delay) && delay > 0) setRetryAt(Date.now() + delay * 1000)
      setError(getApiErrorMessage(error, 'Verification could not be completed. Please try again.'))
      return false
    } finally {
      inFlight.current = false
      setBusy(null)
    }
  }

  return { busy, error, message, secondsLeft,
    send: (email: string) => run('send', email),
    verify: (email: string, code: string) => run('verify', email, code),
  }
}
