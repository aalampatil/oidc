import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Link, useSearchParams } from 'react-router-dom'
import { useThirdPartyStore } from '@/store/thirdParty.store'
import { useAuthStore } from '@/store/auth.store'

const ConsentScreen = () => {
  const [searchParams] = useSearchParams()
  const { authorize, error: thirdPartyError, loading: thirdPartyLoading } = useThirdPartyStore()
  const { register, error: authError, loading: authLoading } = useAuthStore()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState(false)

  const appName = searchParams.get('app') ?? 'Trusted Application'
  const requestedScopes = (searchParams.get('scope') ?? 'openid email profile').split(' ')
  const clientId = searchParams.get('client_id') ?? ''
  const redirectUri = searchParams.get('redirect_uri') ?? ''

  const error = thirdPartyError ?? authError
  const loading = thirdPartyLoading || authLoading

  const handleLogin = async () => {
    const response = await authorize({ email, password, client_id: clientId, redirect_uri: redirectUri }) as unknown as { redirect_url?: string } | null
    if (response?.redirect_url) {
      window.location.href = response.redirect_url
    }
  }

  const handleRegister = async () => {
    const ok = await register({ firstName, email, password })
    if (ok) {
      setRegisterSuccess(true)
      setTimeout(() => {
        setRegisterSuccess(false)
        setMode('login')
      }, 1500)
    }
  }

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-7xl items-center px-6 py-16 md:px-10">
      <div className="grid w-full items-start gap-10 lg:grid-cols-2">

        <div className="space-y-6">
          <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-secondary-background px-4 py-1 text-xs font-heading uppercase tracking-wide shadow-shadow">
            <span className="h-2 w-2 bg-chart-1" />
            Consent Required
          </div>
          <h1 className="text-4xl leading-tight md:text-6xl">
            Review Access for
            <span className="ml-2 bg-main px-2 text-main-foreground">{appName}</span>
          </h1>
          <p className="max-w-xl text-base md:text-lg">
            This app is asking permission to access parts of your identity. Approve only if you trust this client and recognize the requested scopes.
          </p>
          <div className="grid max-w-xl grid-cols-2 gap-3">
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">Secure</p>
              <p className="text-xs uppercase">Token-based access</p>
            </div>
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">Scoped</p>
              <p className="text-xs uppercase">Granular permissions</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-3 -top-3 h-full w-full border-2 border-border bg-chart-4" />
          <div className="relative space-y-5 border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">

            <h2 className="text-2xl font-heading">
              {mode === 'login' ? 'Allow Access?' : 'Create Account'}
            </h2>

            {error && (
              <p className="border-2 border-red-400 bg-red-50 px-3 py-2 text-xs text-red-600 uppercase">
                {error}
              </p>
            )}

            {registerSuccess && (
              <p className="border-2 border-green-400 bg-green-50 px-3 py-2 text-xs text-green-600 uppercase">
                Account created! Redirecting to login...
              </p>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs font-heading uppercase">First Name</label>
                <input
                  type="text"
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-heading uppercase">Email</label>
              <input
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-heading uppercase">Password</label>
              <input
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {mode === 'login' && (
              <div className="space-y-3 border-2 border-border bg-background p-4">
                <p className="text-xs font-heading uppercase">Requested scopes</p>
                <div className="space-y-2">
                  {requestedScopes.map((scope) => (
                    <label key={scope} className="flex items-center gap-3 border-2 border-border bg-secondary-background px-3 py-2 text-sm">
                      <input type="checkbox" defaultChecked className="h-4 w-4 border-2 border-border accent-main" />
                      <span className="font-heading uppercase">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs uppercase">
              You can revoke access later from your account settings and client management pages.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="neutral" asChild>
                <Link to="/">Deny</Link>
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={mode === 'login' ? handleLogin : handleRegister}
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Allow' : 'Register'}
              </Button>
            </div>

            <p className="text-center text-xs uppercase">
              {mode === 'login' ? (
                <>
                  No account?{' '}
                  <button type="button" onClick={() => setMode('register')} className="font-heading underline">
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setMode('login')} className="font-heading underline">
                    Login
                  </button>
                </>
              )}
            </p>

          </div>
        </div>
      </div>
    </section>
  )
}

export default ConsentScreen