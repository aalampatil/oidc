import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { RouterProvider, createBrowserRouter } from "react-router-dom"
import Hero from './pages/Hero'
import Login from './pages/Login'
import Register from './pages/Register'
import TrustForm from './pages/TrustForm'
import AccountPage from './pages/AccountPage'
import ConsentScreen from './pages/ConsentScreen'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "",
        index: true,
        element: <Hero />
      },
      {
        path: "login",
        element: <Login />
      },
      {
        path: "register",
        element: <Register />
      },
      {
        path: "trust-form",
        element: <TrustForm />
      },
      {
        path: "account",
        element: <AccountPage />
      },
      {
        path: "docs",
        element: <div className="mx-auto w-full max-w-7xl px-6 py-20 text-2xl font-heading md:px-10">Docs page coming soon.</div>
      },

    ]
  },
  {
    path: "/consent",
    element: <ConsentScreen />
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
