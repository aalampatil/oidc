import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/hooks/useAccount'
import { useAuthStore } from '@/store/auth.store'
import { useThirdPartyStore } from '@/store/thirdParty.store'
import type { AccountProfile } from '@/services/account'

const inputClass = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'

function ProfileForm({ profile, busy, saving, save }: {
  profile: AccountProfile; busy: boolean; saving: boolean; save: (details: { firstName: string; lastName: string }) => Promise<boolean>
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await save({ firstName: String(data.get('firstName') ?? '').trim(), lastName: String(data.get('lastName') ?? '').trim() })
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="profile-first-name" className="text-sm font-medium">First name</label>
          <input id="profile-first-name" name="firstName" autoComplete="given-name" required maxLength={25}
            defaultValue={profile.given_name ?? ''} disabled={busy} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="profile-last-name" className="text-sm font-medium">Last name</label>
          <input id="profile-last-name" name="lastName" autoComplete="family-name" maxLength={25}
            defaultValue={profile.family_name ?? ''} disabled={busy} className={inputClass} />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="profile-email" className="text-sm font-medium">Email address</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input id="profile-email" type="email" value={profile.email} readOnly className={`${inputClass} bg-neutral-50`} />
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-emerald-700">
            <ShieldCheck size={15} aria-hidden="true" />{profile.email_verified ? 'Verified email' : 'Unverified email'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
        <p className="text-xs text-neutral-500">Your profile is shared with apps you authorize.</p>
        <Button type="submit" disabled={busy}>{saving ? 'Saving...' : 'Save changes'}</Button>
      </div>
    </form>
  )
}

export default function AccountPage() {
  const navigate = useNavigate()
  const account = useAccount()
  const [confirmingDeletion, setConfirmingDeletion] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmationEmail, setConfirmationEmail] = useState('')

  function signOut() {
    useAuthStore.getState().logout()
    useThirdPartyStore.getState().clearState()
    navigate('/login', { replace: true })
  }

  function cancelDeletion() {
    account.clearFeedback()
    setConfirmingDeletion(false)
    setPassword('')
    setConfirmationEmail('')
  }

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const deleted = await account.deleteAccount(password, confirmationEmail)
    setPassword('')
    if (deleted) {
      useThirdPartyStore.setState({ trustedApps: [] })
      useThirdPartyStore.getState().clearState()
      // Leave the protected route before clearing the session, so its redirect
      // cannot replace the deletion success notice with a second navigation.
      navigate('/login', { replace: true, state: { accountDeleted: true }, flushSync: true })
      useAuthStore.getState().logout()
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12 md:px-10 md:py-16">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">Your identity</p>
          <h1 className="text-3xl tracking-tight md:text-4xl">My account</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-500">Manage your profile, account details, and sign-in.</p>
        </div>
        <Button type="button" variant="neutral" className="border-border" disabled={!!account.busy} onClick={signOut}>
          <LogOut size={16} aria-hidden="true" />Sign out
        </Button>
      </div>

      {account.loading ? <div role="status" className="rounded-xl border border-border p-8 text-sm text-neutral-500">Loading your account...</div> : null}
      {!account.loading && !account.profile ? (
        <div role="alert" className="space-y-4 rounded-xl border border-border p-6">
          <p>{account.error ?? 'Your profile is unavailable.'}</p><Button onClick={account.reload}>Try again</Button>
        </div>
      ) : null}

      {!account.loading && account.profile ? (
        <div className="space-y-6">
          <section aria-labelledby="profile-title" className="rounded-xl border border-border bg-white p-6 shadow-shadow md:p-8">
            <div className="mb-7 flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-100"><UserRound size={23} aria-hidden="true" /></div>
              <div><h2 id="profile-title" className="text-lg">Profile details</h2><p className="mt-1 text-sm text-neutral-500">Keep your name up to date.</p></div>
            </div>
            {account.error && !confirmingDeletion ? <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{account.error}</p> : null}
            {account.message ? <p role="status" className="mb-5 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} aria-hidden="true" />{account.message}</p> : null}
            <ProfileForm key={`${account.profile.sub}-${account.profile.updated_at}`} profile={account.profile}
              busy={!!account.busy} saving={account.busy === 'save'} save={account.save} />
          </section>

          <section aria-labelledby="account-details-title" className="rounded-xl border border-border p-6 md:p-8">
            <h2 id="account-details-title" className="text-lg">Account details</h2>
            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
              <div><dt className="text-neutral-500">Account ID</dt><dd className="mt-1.5 break-all font-mono text-xs">{account.profile.sub}</dd></div>
              <div><dt className="text-neutral-500">Member since</dt><dd className="mt-1.5">{new Date(account.profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</dd></div>
            </dl>
            <Link to="/account/apps" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4">View registered OAuth clients<ArrowUpRight size={15} aria-hidden="true" /></Link>
          </section>

          <section aria-labelledby="delete-account-title" className="rounded-xl border border-red-200 p-6 md:p-8">
            <h2 id="delete-account-title" className="text-lg text-red-800">Delete account</h2>
            <p id="delete-account-description" className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Permanently delete your profile, verification codes, and sign-in credentials. This action cannot be undone.
              Apps you have used may keep their own data and remain signed in until their session expires.
            </p>
            {!confirmingDeletion ? (
              <Button type="button" variant="neutral" className="mt-5 border-red-200 text-red-700 hover:bg-red-50" disabled={!!account.busy}
                onClick={() => { account.clearFeedback(); setConfirmingDeletion(true) }}>Delete my account</Button>
            ) : (
              <form onSubmit={remove} aria-describedby="delete-account-description" className="mt-6 max-w-lg space-y-4">
                <div className="space-y-2">
                  <label htmlFor="delete-confirmation-email" className="text-sm font-medium">Type {account.profile.email} to confirm</label>
                  <input id="delete-confirmation-email" type="text" autoComplete="off" required autoFocus value={confirmationEmail}
                    onChange={(event) => setConfirmationEmail(event.target.value)} disabled={!!account.busy} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="delete-password" className="text-sm font-medium">Current password</label>
                  <input id="delete-password" type="password" autoComplete="current-password" required maxLength={256}
                    value={password} onChange={(event) => setPassword(event.target.value)} disabled={!!account.busy} className={inputClass} />
                </div>
                {account.error ? <p role="alert" className="text-sm text-red-800">{account.error}</p> : null}
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" className="border-red-700 bg-red-700 text-white hover:bg-red-800"
                    disabled={!!account.busy || !password || confirmationEmail.trim().toLowerCase() !== account.profile.email.toLowerCase()}>
                    {account.busy === 'delete' ? 'Deleting account...' : 'Permanently delete account'}
                  </Button>
                  <Button type="button" variant="neutral" className="border-border" disabled={!!account.busy} onClick={cancelDeletion}>Cancel</Button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </section>
  )
}
