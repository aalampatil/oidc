import './App.css'
import Header from './components/custom/Header/Header'
import Footer from './components/custom/Footer/Footer'
import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

function App() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />
      <main id="main-content" className={pathname === '/' ? 'landing-content' : 'app-content'}><Outlet /></main>
      <Footer />
    </div>
  )
}
export default App
