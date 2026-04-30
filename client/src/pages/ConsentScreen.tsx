import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Link, useSearchParams } from 'react-router-dom'
import { useThirdPartyStore } from '@/store/thirdParty.store'

const ConsentScreen = () => {
  const [searchParams] = useSearchParams()
  const { authorize } = useThirdPartyStore()
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const appName = searchParams.get('app') ?? 'Trusted Application'
  const requestedScopes = (searchParams.get('scope') ?? 'openid email profile').split(' ')
  const clientId = searchParams.get('client_id') ?? ''
  const redirectUri = searchParams.get('redirect_uri') ?? ''
  const responseType = searchParams.get('response_type') ?? ''

  const handleSubmit = async () => {
    try {
      console.log({ email, password, client_id: clientId, redirect_uri: redirectUri })
      const response = await authorize({ email, password, client_id: clientId, redirect_uri: redirectUri }) as unknown as { redirect_url?: string } | null
      console.log(response)
      if (response?.redirect_url) {
        window.location.href = response.redirect_url
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    console.table([appName, requestedScopes, redirectUri, responseType])
  }, [searchParams, appName, redirectUri, requestedScopes, responseType])

  //todo- ab user jaise hi allow access pe click karega 
  // post request to http://localhost:3000/o/3rd-party-client/authorize
  // body mai data jayga (email, password, client_id, redirect_uri, opt-scope, opt-state) 
  // email password match = redirect to redirect uri which is already handled in backend


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
            <h2 className="text-2xl font-heading">Allow Access?</h2>

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-heading uppercase">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full border-2 border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

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

            <p className="text-xs uppercase">
              You can revoke access later from your account settings and client management pages.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="neutral" asChild>
                <Link to="/">Deny</Link>
              </Button>
              <Button onClick={handleSubmit}>Allow</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ConsentScreen