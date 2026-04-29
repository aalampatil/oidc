import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { Link, useNavigate } from 'react-router-dom'

const Register = () => {
  const navigate = useNavigate()
  const register = useAuthStore((state) => state.register)
  const clearError = useAuthStore((state) => state.clearError)
  const loading = useAuthStore((state) => state.loading)
  const error = useAuthStore((state) => state.error)

  useEffect(() => {
    clearError()
  }, [clearError])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    console.log(formData)

    const ok = await register({
      firstName: String(formData.get('firstName') ?? '').trim(),
      lastName: String(formData.get('lastName') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      password: String(formData.get('password') ?? ''),
    })

    console.log(ok)


    if (!ok) return

    navigate('/login')
  }

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-7xl items-center px-6 py-16 md:px-10">
      <div className="grid w-full items-center gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-secondary-background px-4 py-1 text-xs font-heading uppercase tracking-wide shadow-shadow">
            <span className="h-2 w-2 bg-chart-3" />
            New Account
          </div>

          <h1 className="text-4xl leading-tight md:text-6xl">
            Create Your
            <span className="ml-2 bg-main px-2 text-main-foreground">Identity Account</span>
          </h1>

          <p className="max-w-xl text-base md:text-lg">
            Register once and enable secure OIDC login across apps with verified identity, profile details, and consent-driven access.
          </p>

          <div className="grid max-w-xl grid-cols-2 gap-3">
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">Verified</p>
              <p className="text-xs uppercase">Email workflow</p>
            </div>
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">Portable</p>
              <p className="text-xs uppercase">Cross-app identity</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-3 -top-3 h-full w-full border-2 border-border bg-chart-5" />
          <form onSubmit={handleSubmit} className="relative space-y-4 border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
            <h2 className="text-2xl font-heading">Register</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-xs font-heading uppercase">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  placeholder="Your Name"
                  className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-xs font-heading uppercase">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="last name"
                  className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

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
                placeholder="Create password"
                className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error ? (
              <p className="border-2 border-border bg-chart-3 px-3 py-2 text-xs font-heading uppercase">
                {error}
              </p>
            ) : null}

            <p className="text-xs uppercase">
              By signing up, you agree to secure account creation and token-based authentication policies.
            </p>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p className="text-center text-xs uppercase">
              Already have an account?{' '}
              <Link to="/login" className="font-heading underline underline-offset-2">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Register