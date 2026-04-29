import React from 'react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

const Hero = () => {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-16 md:gap-14 md:px-10 md:py-20">
      <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-secondary-background px-4 py-1 text-xs font-heading uppercase tracking-wide shadow-shadow">
        <span className="h-2 w-2 bg-chart-3" />
        OIDC Identity Layer
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-6">
          <h1 className="text-4xl leading-tight md:text-6xl">
            Ship <span className="bg-main px-2 text-main-foreground">Login</span> Faster.
            <br />
            Keep Your Apps Locked Tight.
          </h1>

          <p className="max-w-xl text-base md:text-lg">
            Drop in standards-based OpenID Connect auth with consent, token handling, and account flows that look clean and feel snappy.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button size="lg" variant="neutral" asChild>
              <Link to="/register">Register</Link>
            </Button>
          </div>

          <div className="grid max-w-xl grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">99.99%</p>
              <p className="text-xs uppercase">Uptime target</p>
            </div>
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">&lt;120ms</p>
              <p className="text-xs uppercase">Token issue</p>
            </div>
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow col-span-2 sm:col-span-1">
              <p className="text-2xl font-heading">OIDC</p>
              <p className="text-xs uppercase">Ready by default</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-3 -top-3 h-full w-full border-2 border-border bg-chart-2" />
          <div className="relative space-y-5 border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
            <p className="text-xs font-heading uppercase">Live Session Preview</p>

            <div className="space-y-3 border-2 border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <p className="font-heading text-sm">Auth Request</p>
                <span className="border-2 border-border bg-chart-1 px-2 py-0.5 text-[10px] font-heading uppercase">Valid</span>
              </div>
              <div className="h-2 w-full bg-secondary-background">
                <div className="h-2 w-4/5 bg-chart-5" />
              </div>
              <p className="text-sm">Scopes: `openid profile email`</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-2 border-border bg-main p-4 text-main-foreground">
                <p className="text-xs uppercase">Token</p>
                <p className="text-lg font-heading">Issued</p>
              </div>
              <div className="border-2 border-border bg-chart-4 p-4">
                <p className="text-xs uppercase">Consent</p>
                <p className="text-lg font-heading">Captured</p>
              </div>
            </div>

            <Button className="w-full" variant="reverse">Run Demo Flow</Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero