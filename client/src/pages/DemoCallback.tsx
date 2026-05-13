import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { authApi } from '@/configs/axiosApi'
import { clearDemoFlowSession, readDemoFlowSession } from '@/lib/demoFlow'

type TokenResponse = {
  access_token: string
  id_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope?: string
}

type UserInfoResponse = {
  sub: string
  email: string
  email_verified: boolean
  given_name: string | null
  family_name: string | null
  name: string
  picture: string | null
}

const tokenPreview = (token: string) =>
  token.length > 28 ? `${token.slice(0, 18)}...${token.slice(-10)}` : token

const DemoCallback = () => {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const [tokens, setTokens] = useState<TokenResponse | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const session = useMemo(() => readDemoFlowSession(), [])

  useEffect(() => {
    const exchangeCode = async () => {
      if (!code) {
        setError('Missing authorization code in callback URL.')
        setLoading(false)
        return
      }

      if (!session) {
        setError('Demo session was not found. Start the demo from the landing page again.')
        setLoading(false)
        return
      }

      if (state !== session.state) {
        setError('State check failed. The callback does not match the demo request.')
        setLoading(false)
        return
      }

      try {
        const { data } = await authApi.post<TokenResponse>('/token', {
          grant_type: 'authorization_code',
          client_id: session.clientId,
          client_secret: session.clientSecret,
          code,
          redirect_uri: session.redirectUri,
          code_verifier: session.codeVerifier,
        })

        setTokens(data)

        const userInfoResponse = await authApi.get<UserInfoResponse>('/userinfo', {
          headers: {
            Authorization: `${data.token_type} ${data.access_token}`,
          },
        })

        setUserInfo(userInfoResponse.data)
        clearDemoFlowSession()
      } catch (exchangeError) {
        const message = axios.isAxiosError(exchangeError)
          ? ((exchangeError.response?.data?.message as string | undefined) ??
            (exchangeError.response?.data?.error as string | undefined) ??
            'Demo token exchange failed.')
          : 'Demo token exchange failed.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void exchangeCode()
  }, [code, session, state])

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-7xl items-center px-6 py-16 md:px-10">
      <div className="grid w-full items-start gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-secondary-background px-4 py-1 text-xs font-heading uppercase tracking-wide shadow-shadow">
            <span className="h-2 w-2 bg-chart-1" />
            Demo Callback
          </div>

          <h1 className="text-4xl leading-tight md:text-6xl">
            Authorization
            <span className="ml-2 bg-main px-2 text-main-foreground">Complete</span>
          </h1>

          <p className="max-w-xl text-base md:text-lg">
            The demo client received an authorization code, exchanged it with PKCE, and called userinfo with the access token.
          </p>

          <div className="grid max-w-xl grid-cols-2 gap-3">
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">{tokens ? 'Issued' : 'Pending'}</p>
              <p className="text-xs uppercase">Token exchange</p>
            </div>
            <div className="border-2 border-border bg-secondary-background p-3 shadow-shadow">
              <p className="text-2xl font-heading">{userInfo ? 'Loaded' : 'Waiting'}</p>
              <p className="text-xs uppercase">Userinfo</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-3 -top-3 h-full w-full border-2 border-border bg-chart-5" />
          <div className="relative space-y-5 border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
            <h2 className="text-2xl font-heading">Demo Result</h2>

            {loading ? (
              <p className="border-2 border-border bg-background px-3 py-2 text-xs font-heading uppercase">
                Exchanging authorization code...
              </p>
            ) : null}

            {error ? (
              <p className="border-2 border-border bg-chart-3 px-3 py-2 text-xs font-heading uppercase">
                {error}
              </p>
            ) : null}

            {tokens ? (
              <div className="space-y-3 border-2 border-border bg-background p-4">
                <p className="text-xs font-heading uppercase">Tokens</p>
                <div className="grid gap-3">
                  <div className="border-2 border-border bg-secondary-background p-3">
                    <p className="text-xs font-heading uppercase">Access Token</p>
                    <p className="mt-1 break-all text-sm">{tokenPreview(tokens.access_token)}</p>
                  </div>
                  <div className="border-2 border-border bg-secondary-background p-3">
                    <p className="text-xs font-heading uppercase">ID Token</p>
                    <p className="mt-1 break-all text-sm">{tokenPreview(tokens.id_token)}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border-2 border-border bg-secondary-background p-3">
                      <p className="text-xs font-heading uppercase">Type</p>
                      <p className="mt-1 text-sm">{tokens.token_type}</p>
                    </div>
                    <div className="border-2 border-border bg-secondary-background p-3">
                      <p className="text-xs font-heading uppercase">Expires</p>
                      <p className="mt-1 text-sm">{tokens.expires_in}s</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {userInfo ? (
              <div className="space-y-3 border-2 border-border bg-background p-4">
                <p className="text-xs font-heading uppercase">Userinfo Claims</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border-2 border-border bg-secondary-background p-3">
                    <p className="text-xs font-heading uppercase">Name</p>
                    <p className="mt-1 text-sm">{userInfo.name || 'Not provided'}</p>
                  </div>
                  <div className="border-2 border-border bg-secondary-background p-3">
                    <p className="text-xs font-heading uppercase">Email</p>
                    <p className="mt-1 break-all text-sm">{userInfo.email}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="neutral" asChild>
                <Link to="/docs">Read Docs</Link>
              </Button>
              <Button asChild>
                <Link to="/">Run Again</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DemoCallback
