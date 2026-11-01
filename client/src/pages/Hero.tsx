import { useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, CheckCheck, Code2, Fingerprint, KeyRound, Layers3, LockKeyhole, Play, ShieldCheck, SlidersHorizontal, Terminal, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_BASE_URL, OIDC_ISSUER_URL } from '@/configs/axiosApi'
import { createDemoNonce, createPkcePair, saveDemoFlowSession } from '@/lib/demoFlow'
import { useThirdPartyStore } from '@/store/thirdParty.store'

const Hero = () => {
  const registerClient = useThirdPartyStore((state) => state.registerClient)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  const handleRunDemoFlow = async () => {
    if (demoLoading) return

    setDemoLoading(true)
    setDemoError(null)

    try {
      const redirectUri = `${window.location.origin}/demo/callback`
      const { codeVerifier, codeChallenge } = await createPkcePair()
      const state = createDemoNonce()
      const nonce = createDemoNonce()
      const registration = await registerClient({
        name: 'OIDC Demo Console',
        redirectUris: [redirectUri],
        scopes: 'openid email profile',
      })

      if (!registration) {
        setDemoError(useThirdPartyStore.getState().error ?? 'Could not create the demo client.')
        return
      }

      saveDemoFlowSession({
        issuer: OIDC_ISSUER_URL,
        clientId: registration.clientId,
        clientSecret: registration.clientSecret,
        redirectUri,
        codeVerifier,
        state,
        nonce,
        createdAt: new Date().toISOString(),
      })

      const params = new URLSearchParams({
        client_id: registration.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      })

      window.location.href = `${API_BASE_URL}/o/3rd-party-client/authorize?${params.toString()}`
    } catch {
      setDemoError('Demo flow could not start. Check that the auth server is running.')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <>
      <section className="hero-section site-container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> THE OPEN IDENTITY LAYER <span className="eyebrow-version">OIDC / OAuth 2.0</span></div>
          <h1>Trust starts<br />with <span className="serif-word">identity.</span></h1>
          <p className="hero-description">A clear connection between your users and your applications. Standards-based authentication, thoughtful consent, and control where it belongs.</p>
          <div className="hero-actions"><Link to="/register" className="neo-button button-dark">Build with OIDC <ArrowUpRight size={17} /></Link><a href="#how-it-works" className="text-link"><span className="play-icon"><Play size={12} fill="currentColor" /></span>See how it works</a></div>
          <div className="hero-assurances"><span><Check size={14} /> OpenID Connect</span><span><Check size={14} /> PKCE protection</span><span><Check size={14} /> Explicit consent</span></div>
        </div>
        <div className="identity-visual" aria-label="Illustration of an application connecting to a user through OIDC">
          <div className="visual-topline"><span>THE IDENTITY CONNECTION</span><span className="visual-index">FIG. 01</span></div>
          <div className="orbit orbit-one" aria-hidden="true"><span className="orbit-light" /></div><div className="orbit orbit-two" aria-hidden="true" />
          <div className="connection-line connection-left" /><div className="connection-line connection-right" />
          <div className="visual-node node-app"><span className="node-icon"><Layers3 size={24} strokeWidth={1.5} /></span><strong>Your application</strong><small>The experience you build</small></div>
          <div className="identity-core"><Fingerprint size={65} strokeWidth={1.15} /><span>oidc.</span></div>
          <div className="visual-node node-user"><span className="node-icon"><UserRound size={24} strokeWidth={1.5} /></span><strong>Your users</strong><small>The people you protect</small></div>
          <div className="visual-verified"><span className="verified-icon"><ShieldCheck size={19} /></span><div><strong>Trust, established.</strong><small>Verified identity. Scoped access.</small></div><CheckCheck size={17} /></div>
          <div className="visual-bottomline"><LockKeyhole size={12} /><span>AUTHORIZATION CODE + PKCE</span><span>Illustrative flow</span></div>
        </div>
      </section>

      <div className="standards-strip site-container"><span>BUILT ON COMMON GROUND</span><div><Fingerprint size={18} /> OpenID Connect</div><div><ShieldCheck size={18} /> OAuth 2.0</div><div><KeyRound size={18} /> PKCE · S256</div><div><Code2 size={18} /> Signed JWTs</div></div>

      <section className="platform-section site-container section-space" id="platform">
        <div className="section-heading"><div><p className="eyebrow">01 / THE PLATFORM</p><h2>One identity layer.<br /><span className="muted-heading">Every connection considered.</span></h2></div><p>Your application handles the experience.<br />OIDC handles the handshake.</p></div>
        <div className="feature-grid">
          <article className="neo-card feature-card"><span className="feature-icon"><Fingerprint size={24} strokeWidth={1.5} /></span><span className="feature-number">01</span><h3>Identity with a foundation.</h3><p>Give your users a consistent sign-in experience with OpenID Connect and the OAuth 2.0 authorization code flow.</p><Link to="/docs">Explore authentication <ArrowUpRight size={15} /></Link></article>
          <article className="neo-card feature-card"><span className="feature-icon"><SlidersHorizontal size={24} strokeWidth={1.5} /></span><span className="feature-number">02</span><h3>Permission with intention.</h3><p>Make access a conscious choice. Let people review the profile, email, and identity scopes an application requests.</p><Link to="/docs">Understand consent <ArrowUpRight size={15} /></Link></article>
          <article className="neo-card feature-card"><span className="feature-icon"><KeyRound size={24} strokeWidth={1.5} /></span><span className="feature-number">03</span><h3>Control through the lifecycle.</h3><p>Exchange authorization codes for signed tokens, refresh sessions, and revoke refresh tokens when access needs to end.</p><Link to="/docs">Explore token flows <ArrowUpRight size={15} /></Link></article>
        </div>
      </section>

      <section className="how-section section-space" id="how-it-works"><div className="site-container">
        <div className="section-heading"><div><p className="eyebrow">02 / HOW IT WORKS</p><h2>A simple path to<br /><span className="serif-word">a trusted connection.</span></h2></div><Link className="text-link" to="/docs">Read the complete guide <ArrowUpRight size={17} /></Link></div>
        <div className="steps-grid">
          <article><div className="step-top"><span className="step-number">01</span><span className="step-line" /></div><h3>Connect your application</h3><p>Register your app, define redirect URIs, and choose the scopes you need. Receive your client credentials.</p><span className="code-chip">client_id + redirect_uri</span></article>
          <article><div className="step-top"><span className="step-number">02</span><span className="step-line" /></div><h3>Let your users decide</h3><p>Send users to the hosted authentication and consent flow. They sign in and approve the requested access.</p><span className="code-chip">authenticate → consent</span></article>
          <article><div className="step-top"><span className="step-number">03</span><Check size={19} className="step-check" /></div><h3>Bring identity back home</h3><p>Exchange the returned code on your backend. Verify the tokens and use identity claims in your application.</p><span className="code-chip">code → tokens → userinfo</span></article>
        </div>
      </div></section>

      <section className="integration-section site-container section-space" id="integration">
        <div className="integration-copy"><p className="eyebrow">03 / DEVELOPER EXPERIENCE</p><h2>Familiar standards.<br /><span className="muted-heading">A clearer starting point.</span></h2><p>No custom authentication protocol to learn. Start with discovery, register a client, and follow the documented authorization flow.</p><ul className="integration-list"><li><Check size={16} /> Provider discovery and public signing keys</li><li><Check size={16} /> Authorization code flow with PKCE S256</li><li><Check size={16} /> UserInfo, refresh, and revocation endpoints</li></ul><Link to="/docs" className="neo-button">Open documentation <ArrowUpRight size={16} /></Link></div>
        <div className="code-window"><div className="code-window-header"><span><Terminal size={15} /> authorization-request</span><span>HTTP</span></div><pre aria-label="Example authorization request"><code><span className="syntax-comment"># Start a trusted connection</span>{'\n'}<span className="syntax-value">GET</span> /o/3rd-party-client/authorize{'\n\n'}<span className="syntax-comment">  # Your registered application</span>{'\n'}  client_id=<span className="syntax-param">YOUR_CLIENT_ID</span>{'\n'}  redirect_uri=<span className="syntax-param">YOUR_CALLBACK_URL</span>{'\n'}  response_type=<span className="syntax-value">code</span>{'\n'}  scope=<span className="syntax-param">openid email profile</span>{'\n\n'}<span className="syntax-comment">  # Bind and protect the request</span>{'\n'}  state=<span className="syntax-param">RANDOM_STATE</span>{'\n'}  nonce=<span className="syntax-param">RANDOM_NONCE</span>{'\n'}  code_challenge=<span className="syntax-param">YOUR_PKCE_CHALLENGE</span>{'\n'}  code_challenge_method=<span className="syntax-value">S256</span></code></pre><div className="code-window-footer"><LockKeyhole size={13} /> Exchange the code securely on your backend.</div></div>
      </section>

      <section className="demo-section site-container" id="demo"><div className="demo-panel neo-card"><div className="demo-icon"><ShieldCheck size={31} strokeWidth={1.3} /></div><div className="demo-copy"><p className="eyebrow">FROM CONCEPT TO CONNECTION</p><h2>Experience the full handshake.</h2><p>Walk through client registration, consent, and token exchange with the interactive demo.</p><small>Requires the authentication server to be running.</small></div><div className="demo-actions"><button className="neo-button button-dark" onClick={handleRunDemoFlow} disabled={demoLoading}><Play size={14} />{demoLoading ? 'Starting demo…' : 'Try the demo'}<ArrowRight size={16} /></button><Link to="/register">Or create your account <ArrowUpRight size={13} /></Link></div>{demoError ? <p className="demo-error" role="alert">{demoError}</p> : null}</div></section>
    </>
  )
}

export default Hero
