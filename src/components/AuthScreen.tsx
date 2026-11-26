import { useState, type FormEvent } from 'react'
import { ArrowRight, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

type Props = { client: SupabaseClient | null; configured: boolean }

export function AuthScreen({ client, configured }: Props) {
  const rememberedEmail = (() => { try { return localStorage.getItem('vedx.rememberedEmail') || '' } catch { return '' } })()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'sign-in') {
        try { localStorage.setItem('vedx.rememberedEmail', email.trim()) } catch { /* Email remains available for this session. */ }
        const result = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (result.error) throw result.error
      } else {
        const result = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (result.error) throw result.error
        try { localStorage.setItem('vedx.rememberedEmail', email.trim()) } catch { /* Email remains available for this session. */ }
        if (!result.data.session) setNotice('Check your email for a confirmation link, then come back here to sign in.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-screen">
    <section className="auth-card">
      <div className="auth-brand"><div className="brand-mark"><span>v</span></div><span className="brand-name">vedx</span><span className="brand-version">V2</span></div>
      <div className="auth-emblem"><Sparkles size={20} /></div>
      <p className="eyebrow">YOUR PERSONAL OS</p>
      <h1>{configured ? (mode === 'sign-in' ? 'Welcome back.' : 'Create your VedX account.') : 'Connect your VedX project.'}</h1>
      <p className="auth-copy">{configured ? 'Sign in to open your private workspace.' : 'Supabase is connected to the app code. Restart the app after adding its local environment settings.'}</p>
      {!configured ? <div className="auth-config-note"><strong>Local setup needed</strong><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></div> : <>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="auth-email">Email</label>
          <div className="auth-input"><Mail size={16} /><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></div>
          <label htmlFor="auth-password">Password</label>
          <div className="auth-input"><LockKeyhole size={16} /><input id="auth-password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" /></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'} <ArrowRight size={16} /></button>
        </form>
        <button className="auth-mode-switch" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setNotice('') }}>
          {mode === 'sign-in' ? 'New to VedX? Create an account' : 'Already have an account? Sign in'}
        </button>
      </>}
      <p className="auth-privacy">VedX remembers your email on this device. Your password is never saved, and you’ll enter it each time you sign in.</p>
    </section>
  </main>
}
