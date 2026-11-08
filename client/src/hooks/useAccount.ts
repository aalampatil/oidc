import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { accountApi, type AccountProfile, type ProfileDetails } from '@/services/account'
import { useAuthStore } from '@/store/auth.store'
import { getApiErrorMessage } from '@/lib/apiError'

export function useAccount() {
  const token = useAuthStore((state) => state.accessToken)
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)
  const inFlight = useRef(false)

  const handleError = useCallback((error: unknown, fallback: string) => {
    if (token !== useAuthStore.getState().accessToken) return
    if (axios.isAxiosError(error) && error.response?.status === 401) useAuthStore.getState().logout()
    else setError(getApiErrorMessage(error, fallback))
  }, [token])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await accountApi.get(token!, controller.signal)
        if (!controller.signal.aborted && token === useAuthStore.getState().accessToken) {
          setProfile(data)
          useAuthStore.setState({ user: data })
        }
      } catch (error) {
        if (!controller.signal.aborted) handleError(error, 'Unable to load your profile. Please try again.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [token, reloadVersion, handleError])

  async function run(action: 'save' | 'delete', operation: (token: string) => Promise<void>) {
    if (!token || inFlight.current) return false
    inFlight.current = true
    setBusy(action)
    setError(null)
    setMessage(null)
    try {
      await operation(token)
      return true
    } catch (error) {
      handleError(error, action === 'save' ? 'Your profile could not be saved.' : 'Your account could not be deleted.')
      return false
    } finally {
      inFlight.current = false
      setBusy(null)
    }
  }

  return {
    profile, loading, busy, error, message,
    clearFeedback: () => { setError(null); setMessage(null) },
    reload: () => setReloadVersion((version) => version + 1),
    save: (details: ProfileDetails) => run('save', async (token) => {
      const data = await accountApi.update(token, details)
      if (token === useAuthStore.getState().accessToken) {
        setProfile(data)
        useAuthStore.setState({ user: data })
        setMessage('Your profile has been saved.')
      }
    }),
    deleteAccount: (password: string, confirmationEmail: string) => run('delete', async (token) => {
      await accountApi.delete(token, password, confirmationEmail)
    }),
  }
}
