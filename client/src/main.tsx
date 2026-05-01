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
import Docs from './pages/Docs'
import Protected from './configs/protected'

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
