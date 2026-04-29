import React from 'react'
import { Button } from '@/components/ui/button'

const TrustForm = () => {
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
          <form className="relative space-y-4 border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
            <h2 className="text-2xl font-heading">Trust Registration Form</h2>

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

            <Button type="submit" size="lg" className="w-full">Create Trusted Client</Button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default TrustForm