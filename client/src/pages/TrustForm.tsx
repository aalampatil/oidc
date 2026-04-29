import React, { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useThirdPartyStore } from '@/store/thirdParty.store'
import { Link } from 'react-router-dom'

const TrustForm = () => {
  const registerClient = useThirdPartyStore((state) => state.registerClient)
  const clearError = useThirdPartyStore((state) => state.clearError)
  const loading = useThirdPartyStore((state) => state.loading)
  const error = useThirdPartyStore((state) => state.error)
  const registration = useThirdPartyStore((state) => state.registration)

  useEffect(() => {
    clearError()
  }, [clearError])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    const formData = new FormData(event.currentTarget)

    const redirectUris = String(formData.get('redirectUris') ?? '')
      .split(',')
      .map((uri) => uri.trim())
      .filter(Boolean)

    await registerClient({
      name: String(formData.get('name') ?? '').trim(),
      redirectUris,
      scopes: String(formData.get('scopes') ?? '').trim() || 'openid email profile',
    })
  }

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-7xl items-center px-6 py-16 md:px-10">
      <div className="grid w-full items-start gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-secondary-background px-4 py-1 text-xs font-heading uppercase tracking-wide shadow-shadow">
            <span className="h-2 w-2 bg-chart-5" />
            OAuth Client Trust
          </div>

          <h1 className="text-4xl leading-tight md:text-6xl">
            Register a
            <span className="ml-2 bg-main px-2 text-main-foreground">Trusted Client</span>
          </h1>

          <p className="max-w-xl text-base md:text-lg">
            Configure your OAuth application with client credentials, redirect URIs, and allowed scopes so it can safely use your OIDC provider.
          </p>

          <div className="grid max-w-xl grid-cols-2 gap-3">
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">App Name</p>
              <p className="text-xs uppercase">Client display identity</p>
            </div>
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">Redirect URIs</p>
              <p className="text-xs uppercase">Callback destinations</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-3 -top-3 h-full w-full border-2 border-border bg-chart-2" />
          <form onSubmit={handleSubmit} className="relative space-y-4 border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
            <h2 className="text-2xl font-heading">Trust Registration Form</h2>

            <fieldset disabled={loading} className="space-y-4 disabled:opacity-80">
              <div className="space-y-2">
                <label htmlFor="name" className="text-xs font-heading uppercase">App Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Inventory Dashboard"
                  className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="redirectUris" className="text-xs font-heading uppercase">Redirect URIs</label>
                <textarea
                  id="redirectUris"
                  name="redirectUris"
                  required
                  rows={3}
                  placeholder="https://app.example.com/callback"
                  className="w-full resize-none border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[10px] uppercase">Use comma-separated URIs if multiple callbacks are needed.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="scopes" className="text-xs font-heading uppercase">Scopes</label>
                <input
                  id="scopes"
                  name="scopes"
                  type="text"
                  defaultValue="openid email profile"
                  placeholder="openid email profile"
                  className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {error ? (
                <p className="border-2 border-border bg-chart-3 px-3 py-2 text-xs font-heading uppercase">
                  {error}
                </p>
              ) : null}

              {registration ? (
                <div className="space-y-2 border-2 border-border bg-background p-3">
                  <p className="text-xs font-heading uppercase">Latest created credentials</p>
                  <p className="text-sm"><span className="font-heading">Client ID:</span> {registration.clientId}</p>
                  <p className="text-sm break-all"><span className="font-heading">Client Secret:</span> {registration.clientSecret}</p>
                  <p className="text-[10px] uppercase">Save these now. Secret is only shown at creation time.</p>
                </div>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? 'Creating Trusted Client...' : 'Create Trusted Client'}
              </Button>
            </fieldset>

            <p className="text-center text-xs uppercase">
              Want all created clients?{' '}
              <Link to="/account" className="font-heading underline underline-offset-2">
                Open Account Page
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}

export default TrustForm