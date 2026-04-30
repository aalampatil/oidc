import React from 'react'
import { Link } from 'react-router-dom'

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="mx-auto w-full max-w-7xl px-6 pb-8 pt-6 md:px-10">
      <div className="space-y-4 border-2 border-border bg-secondary-background p-5 shadow-shadow md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-2">
            <p className="inline-flex w-fit items-center gap-2 border-2 border-border bg-main px-3 py-1 text-xs font-heading uppercase text-main-foreground">
              Identity Provider
            </p>
            <p className="max-w-xl text-sm">
              Secure authentication, token-based access, and consent-driven trust for third-party apps.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-2 text-xs font-heading uppercase sm:grid-cols-4">
            <Link to="/" className="border-2 border-border bg-background px-3 py-2 text-center hover:bg-main hover:text-main-foreground">
              Home
            </Link>
            <Link to="/docs" className="border-2 border-border bg-background px-3 py-2 text-center hover:bg-main hover:text-main-foreground">
              Docs
            </Link>
            <Link to="/account" className="border-2 border-border bg-background px-3 py-2 text-center hover:bg-main hover:text-main-foreground">
              Account
            </Link>
            <Link to="/trust-form" className="border-2 border-border bg-background px-3 py-2 text-center hover:bg-main hover:text-main-foreground">
              Trust Form
            </Link>
          </nav>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="border-2 border-border bg-background p-3">
            <p className="text-lg font-heading">OIDC</p>
            <p className="text-xs uppercase">Standards-based identity</p>
          </div>
          <div className="border-2 border-border bg-background p-3">
            <p className="text-lg font-heading">Consent</p>
            <p className="text-xs uppercase">Scope-level permissions</p>
          </div>
          <div className="border-2 border-border bg-background p-3">
            <p className="text-lg font-heading">Security</p>
            <p className="text-xs uppercase">Signed token workflow</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-border pt-3 text-xs uppercase">
          <p className="font-heading">OIDC Service . {year}</p>
          <p>Manage trusted clients responsibly</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer