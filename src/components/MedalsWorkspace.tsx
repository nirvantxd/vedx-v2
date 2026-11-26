import { useEffect, useState } from 'react'
import { Activity, BookOpen, Check, Dumbbell, NotebookPen, Sparkles, Utensils } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

type RecordRow = { kind: string; payload: Record<string, unknown> }
const awards = [
  { name: 'First step', detail: 'Save your first VedX entry', kind: 'all', target: 1, icon: Sparkles, tone: 'violet' },
  { name: 'Curious mind', detail: 'Log five study sessions', kind: 'study', target: 5, icon: BookOpen, tone: 'blue' },
  { name: 'In motion', detail: 'Log five workouts', kind: 'fitness', target: 5, icon: Dumbbell, tone: 'green' },
  { name: 'Nourishing days', detail: 'Save five meals', kind: 'nutrition', target: 5, icon: Utensils, tone: 'orange' },
  { name: 'Pages kept', detail: 'Write five diary entries', kind: 'diary', target: 5, icon: NotebookPen, tone: 'rose' },
  { name: 'Showing up', detail: 'Check in to a habit seven times', kind: 'habit-days', target: 7, icon: Activity, tone: 'violet' },
]

export function MedalsWorkspace({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { void client.from('workspace_entries').select('kind,payload').then(({data,error})=>{if(error)setError(error.message);else setRows((data||[]) as RecordRow[]);setLoading(false)}) }, [client])
  const habitDays = new Set(rows.filter(row=>row.kind==='habits').flatMap(row=>Array.isArray(row.payload.completed_dates)?row.payload.completed_dates as string[]:[])).size
  const countFor = (kind: string) => kind==='all'?rows.length:kind==='habit-days'?habitDays:rows.filter(row=>row.kind===kind).length
  const earned = awards.filter(award=>countFor(award.kind)>=award.target).length
  return <section className="module-page medals-page"><div className="module-title-row"><div><p className="eyebrow">A RECORD OF YOUR EFFORT</p><h1>Medals</h1><p className="welcome-sub">Small milestones that recognize the care you put into your life.</p></div><div className="medal-total"><span>✦</span><strong>{earned}<small> / {awards.length}</small></strong><small>earned</small></div></div>{error&&<div className="ai-error" role="alert">Could not load your progress: {error}</div>}<div className="medal-grid">{awards.map(award=>{const count=countFor(award.kind);const unlocked=count>=award.target;const Icon=award.icon;return <article className={`panel medal-card ${unlocked?'unlocked':'locked'}`} key={award.name}><div className={`medal-emblem ${award.tone}`}>{unlocked?<Icon size={21}/>:<span>✦</span>}</div><div className="medal-copy"><div className="medal-state">{unlocked?<><Check size={12}/> EARNED</>:'IN PROGRESS'}</div><h2>{award.name}</h2><p>{award.detail}</p><div className="medal-progress"><span style={{width:`${Math.min(100,count/award.target*100)}%`}}/></div><small>{loading?'Loading…':`${Math.min(count,award.target)} / ${award.target}`}</small></div></article>})}</div><div className="medal-note panel"><Sparkles size={16}/><p>Every medal follows activity you have saved in your account. There is no deadline and no streak to lose.</p></div></section>
}
