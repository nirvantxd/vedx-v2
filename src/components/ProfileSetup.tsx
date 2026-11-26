import { useState, type FormEvent } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export type UserProfile = { user_id: string; name: string; age: number; profession: string }

export function ProfileSetup({ client, user, onSaved }: { client: SupabaseClient; user: User; onSaved: (profile: UserProfile) => void }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [profession, setProfession] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const profile = { user_id: user.id, name: name.trim(), age: Number(age), profession: profession.trim() }
    const { error: saveError } = await client.from('profiles').upsert(profile, { onConflict: 'user_id' })
    setBusy(false)
    if (saveError) { setError(`Could not save your profile: ${saveError.message}`); return }
    onSaved(profile)
  }

  return <main className="auth-screen"><section className="auth-card profile-setup-card">
    <div className="auth-brand"><div className="brand-mark"><span>v</span></div><span className="brand-name">vedx</span><span className="brand-version">V2</span></div>
    <div className="auth-emblem"><Sparkles size={20} /></div><p className="eyebrow">PERSONALIZE YOUR PLANS</p><h1>Let’s set up your profile.</h1>
    <p className="auth-copy">Gemini can use these details to tailor suggestions. They stay in your private profile and are shared with Gemini when you request a plan.</p>
    <form className="auth-form" onSubmit={save}>
      <label htmlFor="profile-name">What should we call you?</label><input className="profile-field" id="profile-name" autoComplete="name" maxLength={100} required value={name} onChange={event => setName(event.target.value)} placeholder="Your name" />
      <label htmlFor="profile-age">How old are you?</label><input className="profile-field" id="profile-age" type="number" min={1} max={120} required value={age} onChange={event => setAge(event.target.value)} placeholder="Age" />
      <label htmlFor="profile-profession">What do you do?</label><input className="profile-field" id="profile-profession" maxLength={120} required value={profession} onChange={event => setProfession(event.target.value)} placeholder="Student, designer, nurse…" />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'} <ArrowRight size={16} /></button>
    </form>
  </section></main>
}
