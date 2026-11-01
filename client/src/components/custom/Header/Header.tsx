import { useState } from 'react'
import { ArrowUpRight, Fingerprint, Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const signedIn = useAuthStore((state) => Boolean(state.accessToken))
  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Link to="/" className="brand" aria-label="OIDC home" onClick={() => setMenuOpen(false)}>
          <span className="brand-symbol"><Fingerprint size={25} strokeWidth={1.6} /></span>
          <span>oidc<span className="brand-period">.</span></span><span className="brand-caption">IDENTITY, SIMPLIFIED</span>
        </Link>
        <button className="menu-toggle neo-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <nav id="main-navigation" className={`header-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation" onClick={() => setMenuOpen(false)}>
          <Link to="/#platform">Platform</Link><Link to="/#how-it-works">How it works</Link><NavLink to="/docs">Documentation</NavLink><span className="nav-divider" />
          <NavLink to={signedIn ? '/account' : '/login'}>{signedIn ? 'My account' : 'Sign in'}</NavLink>
          <Link className="neo-button button-dark button-small" to={signedIn ? '/trust-form' : '/register'}>{signedIn ? 'Connect an app' : 'Get started'}<ArrowUpRight size={15} /></Link>
        </nav>
      </div>
    </header>
  )
}
export default Header
