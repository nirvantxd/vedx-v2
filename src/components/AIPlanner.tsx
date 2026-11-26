import { useState, type FormEvent } from 'react'
import { ArrowRight, CircleHelp, LoaderCircle, Sparkles } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserProfile } from './ProfileSetup'

type Plan = {
  summary: string
  goals: Array<{ title: string; category: string; desired_outcome: string; target_date: string | null; milestones: Array<{ title: string; target_date: string | null }> }>
  habits: Array<{ title: string; frequency: string; rationale: string }>
  tasks: Array<{ title: string; due_date: string | null }>
  assumptions: string[]
  questions: string[]
}

export function AIPlanner({ client, profile, onSaved }: { client: SupabaseClient; profile: UserProfile; onSaved: () => Promise<void> }) {
  const [intent, setIntent] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSavedMessage('')
    setPlan(null)
    try {
      const { data, error: invokeError } = await client.functions.invoke('plan', { body: { intent: intent.trim(), profile: { name: profile.name, age: profile.age, profession: profile.profession } } })
      if (invokeError) {
        let message = invokeError.message || 'The planning request failed. Try again shortly.'
        const response = (invokeError as typeof invokeError & { context?: unknown }).context
        if (response instanceof Response) {
          try {
            const payload: unknown = await response.clone().json()
            if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
              message = payload.error
            }
          } catch {
            // Keep the generic message when the function has no JSON error body.
          }
        }
        setError(message)
        return
      }
      if (!data?.plan) {
        setError(data?.error || 'The planning service returned no plan.')
        return
      }

      const generatedPlan = data.plan as Plan
      const { data: savedCounts, error: saveError } = await client.rpc('save_ai_plan', {
        p_goals: generatedPlan.goals,
        p_tasks: generatedPlan.tasks,
      })
      if (saveError) {
        setPlan(generatedPlan)
        setError('VedX generated the plan but could not save it to Goals and Tasks. ' + saveError.message)
        return
      }

      setPlan(generatedPlan)
      const counts = savedCounts as { goal_count?: number; milestone_count?: number; task_count?: number } | null
      setSavedMessage(`Saved ${counts?.goal_count ?? generatedPlan.goals.length} goals and ${counts?.task_count ?? generatedPlan.tasks.length} tasks to your workspace.`)
      try {
        await onSaved()
      } catch {
        setError('The plan was saved, but the workspace lists could not refresh. Reopen Goals or Tasks to load it.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? `The planning request failed: ${cause.message}` : 'The planning request could not be completed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="module-page ai-planner-page">
    <div className="module-title-row"><div><p className="eyebrow">A FIRST DRAFT, FOR YOU TO REVIEW</p><h1>Plan with AI</h1><p className="welcome-sub">Turn an intention into a small, practical next step.</p></div></div>
    <div className="ai-privacy-note"><Sparkles size={16} /><span>Your prompt and profile ({profile.name}, {profile.age}, {profile.profession}) are sent to Google Gemini to tailor the plan. Successful plans are saved to your private Goals and Tasks.</span></div>
    <form className="panel ai-prompt-card" onSubmit={createDraft}>
      <label htmlFor="plan-intent">What would you like help planning?</label>
      <textarea id="plan-intent" rows={5} maxLength={4000} required value={intent} onChange={event => setIntent(event.target.value)} placeholder="For example: I want to build a steady study routine for my exams next term." />
      <div className="ai-prompt-actions"><span>{intent.length}/4000</span><button className="primary-button" disabled={busy || !intent.trim()}>{busy ? <><LoaderCircle className="spin" size={16} /> Making a draft…</> : <>Make a draft <ArrowRight size={16} /></>}</button></div>
    </form>
    {error && <div className="ai-error" role="alert">{error}</div>}
    {savedMessage && <div className="ai-saved-note" role="status">{savedMessage}</div>}
    {plan && <div className="ai-result">
      <section className="panel ai-result-summary"><p className="eyebrow">DRAFT PLAN · REVIEW BEFORE USING</p><h2>{plan.summary}</h2></section>
      {plan.goals.length > 0 && <section className="panel ai-result-section"><h3>Goals</h3>{plan.goals.map((goal, index) => <article className="ai-plan-item" key={index}><div><strong>{goal.title}</strong><span className="task-category">{goal.category}</span></div><p>{goal.desired_outcome}</p>{goal.milestones.map((milestone, itemIndex) => <p className="ai-subitem" key={itemIndex}>• {milestone.title}</p>)}</article>)}</section>}
      {plan.habits.length > 0 && <section className="panel ai-result-section"><h3>Habits</h3>{plan.habits.map((habit, index) => <article className="ai-plan-item" key={index}><div><strong>{habit.title}</strong><span className="task-category">{habit.frequency}</span></div><p>{habit.rationale}</p></article>)}</section>}
      {plan.tasks.length > 0 && <section className="panel ai-result-section"><h3>Suggested tasks</h3>{plan.tasks.map((task, index) => <article className="ai-plan-task" key={index}><span>{task.title}</span>{task.due_date && <small>{task.due_date}</small>}</article>)}</section>}
      {(plan.assumptions.length > 0 || plan.questions.length > 0) && <section className="panel ai-result-section"><h3><CircleHelp size={17} /> Notes to review</h3>{plan.assumptions.map((item, index) => <p className="ai-note-line" key={`a${index}`}>Assumption: {item}</p>)}{plan.questions.map((item, index) => <p className="ai-note-line" key={`q${index}`}>Question: {item}</p>)}</section>}
    </div>}
  </section>
}
