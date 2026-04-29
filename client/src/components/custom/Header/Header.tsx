import React from 'react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

const Header = () => {
  return (
    <header className="mx-auto w-full max-w-7xl px-6 pt-6 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-border bg-secondary-background px-4 py-3 shadow-shadow">
        <Link to="/" className="text-base font-heading uppercase">
          OIDC Service
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="neutral" asChild>
            <Link to="/docs">Docs</Link>
          </Button>
          <Button size="sm" variant="neutral" asChild>
            <Link to="/account">Account Page</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/trust-form">Trust Form</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

export default Header