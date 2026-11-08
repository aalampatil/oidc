import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useEmailVerification } from '@/hooks/useEmailVerification'

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { email?: string; retryAfter?: number; deliveryFailed?: boolean; returnTo?: string } | null
  const [email, setEmail] = useState(state?.email ?? '')
  const [code, setCode] = useState('')
  const emailInput = useRef<HTMLInputElement>(null)
  const verification = useEmailVerification(state?.retryAfter ?? 0)
  const returnTo = state?.returnTo?.startsWith('/consent?') ? state.returnTo : '/login'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await verification.verify(email.trim(), code)) navigate(returnTo, { replace: true, state: { emailVerified: true } })
  }

  return (
    <section className="mx-auto flex min-h-[80vh] w-full max-w-xl items-center px-6 py-16">
      <div className="w-full space-y-5 border-2 border-border bg-secondary-background p-6 shadow-shadow md:p-8">
        <h1 className="text-3xl font-heading">Verify your email</h1>
        <p>Enter the six-digit code from your email. It expires in 10 minutes.</p>
        {state?.deliveryFailed && !verification.message ? <p role="status">Your account was created, but we couldn't send the email. Use “Send a new code” to try again.</p> : null}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="verification-email" className="text-xs font-heading uppercase">Email address</label>
            <input ref={emailInput} id="verification-email" type="email" autoComplete="email" required value={email}
              onChange={(event) => { setEmail(event.target.value); setCode('') }} disabled={!!verification.busy}
              className="w-full border-2 border-border bg-background px-3 py-2 focus:ring-2 focus:ring-ring" />
          </div>
          <div className="space-y-2">
            <label htmlFor="verification-code" className="text-xs font-heading uppercase">Verification code</label>
            <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" required
              pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={(event) => setCode(event.target.value)}
              aria-describedby="code-help" disabled={!!verification.busy}
              className="w-full border-2 border-border bg-background px-3 py-2 text-2xl tracking-widest focus:ring-2 focus:ring-ring" />
            <p id="code-help" className="text-sm">Check your inbox and spam folder. Requesting a new code replaces the previous one.</p>
          </div>
          {verification.error ? <p role="alert" className="border-2 border-border bg-chart-3 px-3 py-2">{verification.error}</p> : null}
          {verification.message ? <p role="status">{verification.message}</p> : null}
          <Button type="submit" className="w-full" disabled={!!verification.busy}>
            {verification.busy === 'verify' ? 'Verifying...' : 'Verify email'}
          </Button>
          <Button type="button" variant="neutral" className="w-full"
            disabled={!!verification.busy || verification.secondsLeft > 0 || !email.trim()}
            onClick={() => { if (emailInput.current?.reportValidity()) void verification.send(email.trim()) }}>
            {verification.busy === 'send' ? 'Sending...' : verification.secondsLeft > 0 ? `Send again in ${verification.secondsLeft}s` : 'Send a new code'}
          </Button>
        </form>
        <p className="text-center text-sm"><Link to={returnTo} className="underline">Back to sign in</Link></p>
      </div>
    </section>
  )

}
