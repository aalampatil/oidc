import React from 'react'
import { Button } from '@/components/ui/button'
import { useThirdPartyStore } from '@/store/thirdParty.store'
import { Link } from 'react-router-dom'

const AccountPage = () => {
  const trustedApps = useThirdPartyStore((state) => state.trustedApps)

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-7xl flex-col gap-8 px-6 py-16 md:px-10">
      <div className="space-y-4">
        <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-secondary-background px-4 py-1 text-xs font-heading uppercase tracking-wide shadow-shadow">
          <span className="h-2 w-2 bg-chart-2" />
          Account Dashboard
        </div>
        <h1 className="text-4xl leading-tight md:text-6xl">
          Your Trusted
          <span className="ml-2 bg-main px-2 text-main-foreground">OAuth Clients</span>
        </h1>
        <p className="max-w-3xl text-base md:text-lg">
          View applications you registered through the trust form. Keep client credentials secure and rotate if you suspect exposure.
        </p>
      </div>

      {trustedApps.length === 0 ? (
        <div className="border-2 border-border bg-secondary-background p-6 shadow-shadow">
          <p className="text-xl font-heading">No trusted clients yet</p>
          <p className="mt-2 text-sm">Create one from trust form to see app details here.</p>
          <Button className="mt-4" asChild>
            <Link to="/trust-form">Create Trust Form</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {trustedApps.map((app) => (
            <article
              key={`${app.clientId}-${app.createdAt}`}
              className="relative border-2 border-border bg-secondary-background p-5 shadow-shadow"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-heading">{app.name}</h2>
                <span className="border-2 border-border bg-chart-1 px-2 py-0.5 text-[10px] font-heading uppercase">
                  Trusted App
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="border-2 border-border bg-background p-3">
                  <p className="text-xs font-heading uppercase">Client ID</p>
                  <p className="mt-1 break-all text-sm">{app.clientId}</p>
                </div>
                <div className="border-2 border-border bg-background p-3">
                  <p className="text-xs font-heading uppercase">Client Secret</p>
                  <p className="mt-1 break-all text-sm">{app.clientSecret}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="border-2 border-border bg-background p-3">
                  <p className="text-xs font-heading uppercase">Scopes</p>
                  <p className="mt-1 text-sm">{app.scopes}</p>
                </div>
                <div className="border-2 border-border bg-background p-3">
                  <p className="text-xs font-heading uppercase">Created</p>
                  <p className="mt-1 text-sm">{new Date(app.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-3 border-2 border-border bg-background p-3">
                <p className="text-xs font-heading uppercase">Redirect URIs</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {app.redirectUris.map((uri) => (
                    <li key={uri} className="break-all">- {uri}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default AccountPage