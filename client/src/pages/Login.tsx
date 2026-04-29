import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { Link, useNavigate } from 'react-router-dom'

const Login = () => {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const getUserInfo = useAuthStore((state) => state.getUserInfo)
  const clearError = useAuthStore((state) => state.clearError)
  const loading = useAuthStore((state) => state.loading)
  const error = useAuthStore((state) => state.error)

  useEffect(() => {
    clearError()
  }, [clearError])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const ok = await login({
      email: String(formData.get('email') ?? '').trim(),
      password: String(formData.get('password') ?? ''),
    })

    if (!ok) return

    await getUserInfo()
    navigate('/')
  }

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-7xl items-center px-6 py-16 md:px-10">
      <div className="grid w-full items-center gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-secondary-background px-4 py-1 text-xs font-heading uppercase tracking-wide shadow-shadow">
            <span className="h-2 w-2 bg-chart-2" />
            Welcome Back
          </div>

          <h1 className="text-4xl leading-tight md:text-6xl">
            Login to Your
            <span className="ml-2 bg-main px-2 text-main-foreground">OIDC Console</span>
          </h1>

          <p className="max-w-xl text-base md:text-lg">
            Continue with secure sign-in and manage consent flows, identity sessions, and trusted app access in one place.
          </p>

          <div className="grid max-w-xl grid-cols-2 gap-3">
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">Secure</p>
              <p className="text-xs uppercase">Password + salt</p>
            </div>
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">OIDC</p>
              <p className="text-xs uppercase">Session ready</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-3 -top-3 h-full w-full border-2 border-border bg-chart-4" />
          <form onSubmit={handleSubmit} className="relative space-y-5 border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
            <h2 className="text-2xl font-heading">Sign In</h2>

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-heading uppercase">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-heading uppercase">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter password"
                className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error ? (
              <p className="border-2 border-border bg-chart-3 px-3 py-2 text-xs font-heading uppercase">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 uppercase">
                <input type="checkbox" className="h-4 w-4 border-2 border-border accent-main" />
                Remember me
              </label>
              <a href="#" className="font-heading underline underline-offset-2">Forgot password?</a>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Signing In...' : 'Login Securely'}
            </Button>

            <p className="text-center text-xs uppercase">
              New here?{' '}
              <Link to="/register" className="font-heading underline underline-offset-2">
                Create account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Login