import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom"
import Hero from './pages/Hero'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import TrustForm from './pages/TrustForm'
import AccountPage from './pages/AccountPage'
import RegisteredClients from './pages/RegisteredClients'
import ConsentScreen from './pages/ConsentScreen'
import Docs from './pages/Docs'
import Protected from './configs/protected'
import DemoCallback from './pages/DemoCallback'

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: 'profile', element: <Navigate to="/account" replace /> },
      { path: 'account/apps', element: <Protected authentication><RegisteredClients /></Protected> },
      { path: 'verify-email', element: <VerifyEmail /> },
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
        element: <Protected authentication>
          <TrustForm />
        </Protected>
      },
      {
        path: "account",
        element: <Protected authentication>
          <AccountPage />
        </Protected>
      },
      {
        path: "docs",
        element: <Docs />
      },
      {
        path: "demo/callback",
        element: <DemoCallback />
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
