import { ArrowUpRight, Fingerprint } from 'lucide-react'
import { Link } from 'react-router-dom'

const Footer = () => (
  <footer className="site-footer">
    <div className="site-container">
      <div className="footer-top">
        <div className="footer-brand">
          <Link to="/" className="brand" aria-label="OIDC home"><span className="brand-symbol"><Fingerprint size={25} strokeWidth={1.6} /></span><span>oidc<span className="brand-period">.</span></span></Link>
          <p>A considered foundation for identity.<br />Built on open standards. Designed for trust.</p>
        </div>
        <nav aria-label="Platform links"><h2>Platform</h2><Link to="/#platform">Overview</Link><Link to="/#how-it-works">How it works</Link><Link to="/trust-form">Connect an application <ArrowUpRight size={12} /></Link></nav>
        <nav aria-label="Developer links"><h2>Developers</h2><Link to="/docs">Documentation</Link><Link to="/#integration">Integration guide</Link><Link to="/#demo">Explore the demo</Link></nav>
        <nav aria-label="Account links"><h2>Your workspace</h2><Link to="/register">Create an account</Link><Link to="/login">Sign in</Link><Link to="/account">Manage account</Link></nav>
      </div>
      <div className="footer-bottom"><p>© {new Date().getFullYear()} OIDC Service</p><span><span className="status-dot" /> Open standards. Connected experiences.</span><a href="#main-content">Back to top ↑</a></div>
    </div>
  </footer>
)
export default Footer
