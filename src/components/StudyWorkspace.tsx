import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BookOpen, Check, Pause, Play, RotateCcw, Sparkles, Timer } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'

type SessionType = 'deep' | 'rapid'
type StudyEntry = { id:string; title:string; entry_date:string; payload:Record<string,unknown> }
const presets:Record<SessionType,{name:string;minutes:number;tagline:string;accent:string}> = {
  deep:{name:'Deep work',minutes:90,tagline:'Go deep. Give one thing your full attention.',accent:'deep'},
  rapid:{name:'Rapid learning',minutes:25,tagline:'One small idea can change your whole day.',accent:'rapid'},
}
const clockText=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`
const today=()=>new Date().toLocaleDateString('en-CA')
function restoreTimer(key:string){try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'?value as {mode?:SessionType;remaining?:number;running?:boolean;endAt?:number|null;subject?:string;saved?:boolean}:{}}catch{return {}}}

export function StudyWorkspace({client,userId}:{client:SupabaseClient;userId:string}) {
  const storageKey=`vedx:study-timer:${userId}`
  const [mode,setMode]=useState<SessionType>(()=>restoreTimer(storageKey).mode==='rapid'?'rapid':'deep')
  const [remaining,setRemaining]=useState(()=>{const state=restoreTimer(storageKey);return Number.isFinite(state.remaining)?Math.max(0,state.remaining!):presets.deep.minutes*60})
  const [running,setRunning]=useState(()=>{const state=restoreTimer(storageKey);return state.running===true&&Boolean(state.endAt)})
  const [endAt,setEndAt]=useState<number|null>(()=>restoreTimer(storageKey).endAt||null)
  const [subject,setSubject]=useState(()=>restoreTimer(storageKey).subject||'')
  const [entries,setEntries]=useState<StudyEntry[]>([])
  const [error,setError]=useState('')
  const [saved,setSaved]=useState(()=>restoreTimer(storageKey).saved===true)
  const [saving,setSaving]=useState(false)
  const savingRef=useRef(false)

  useEffect(()=>{void client.from('workspace_entries').select('id,title,entry_date,payload').eq('kind','study').order('created_at',{ascending:false}).limit(12).then(({data,error})=>{if(error)setError(error.message);else setEntries((data||[]) as StudyEntry[])})},[client])
  useEffect(()=>{if(!running||!endAt)return;const tick=()=>{const next=Math.max(0,Math.ceil((endAt-Date.now())/1000));setRemaining(next);if(next===0){setRunning(false);setEndAt(null);void saveSession(undefined,true)}};tick();const id=window.setInterval(tick,1000);return()=>window.clearInterval(id)},[running,endAt,saved,subject,mode])
  useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify({mode,remaining,running,endAt,subject,saved}))}catch{/* Keep the live timer usable if storage is unavailable. */}},[storageKey,mode,remaining,running,endAt,subject,saved])
  const full=presets[mode].minutes*60
  const progress=1-remaining/full
  const chosen=(next:SessionType)=>{if(running||saving)return;setRunning(false);setEndAt(null);setMode(next);setRemaining(presets[next].minutes*60);setSaved(false);savingRef.current=false}
  function start(){const nextRemaining=saved||remaining===0?full:remaining;if(saved||remaining===0)setRemaining(full);savingRef.current=false;setEndAt(Date.now()+nextRemaining*1000);setRunning(true);setSaved(false)}
  function pause(){setRunning(false);setEndAt(null)}
  function reset(){pause();setRemaining(full);setSaved(false)}
  async function saveSession(event?:FormEvent,completed=false){event?.preventDefault();if(saved||savingRef.current)return;if(!completed)pause();savingRef.current=true;setSaving(true);const elapsed=completed?presets[mode].minutes*60:presets[mode].minutes*60-remaining;const {data,error}=await client.from('workspace_entries').insert({kind:'study',title:(subject.trim()||'Study session').slice(0,160),entry_date:today(),payload:{session_type:mode==='deep'?'90-minute deep work':'25-minute rapid learning',duration:Math.max(1,Math.round(elapsed/60)),completed}}).select('id,title,entry_date,payload').single();setSaving(false);if(error){savingRef.current=false;setError(error.message);return}setSaved(true);setEntries(current=>[data as StudyEntry,...current]);}
  return <section className="module-page study-page"><div className="module-title-row"><div><p className="eyebrow">LEARN WITH INTENTION</p><h1>Study</h1><p className="welcome-sub">Choose a rhythm, settle in, and give your attention somewhere to land.</p></div><div className="study-today"><BookOpen size={16}/><span>{entries.filter(entry=>entry.entry_date===today()).length} sessions today</span></div></div>
    <div className="study-layout"><article className={`study-clock-card ${presets[mode].accent}`}><div className="study-clock-header"><span className="study-live-dot"/>{running?'SESSION IN PROGRESS':'YOUR FOCUS SESSION'}<span className="study-session-chip">{presets[mode].minutes} MIN</span></div><div className="study-digital-wrap"><svg className="study-ring" viewBox="0 0 280 280" aria-hidden="true"><circle className="study-ring-track" cx="140" cy="140" r="126"/><circle className="study-ring-progress" cx="140" cy="140" r="126" style={{strokeDashoffset:`${791.68*(1-progress)}`}}/></svg><div className="study-digital"><div className="study-time-label">{running?'TIME LEFT':'READY WHEN YOU ARE'}</div><div className="study-time">{clockText(remaining)}</div><div className="study-clock-caption">{presets[mode].name}</div></div></div><div className="study-clock-footer"><p>{remaining===0?'Beautiful work. Take a breath before the next thing.':presets[mode].tagline}</p><div className="study-clock-actions"><button className="study-play-button" onClick={running?pause:start} disabled={saving}>{running?<><Pause size={16}/> Pause</>:<><Play size={16} fill="currentColor"/> {saved?'Start a new session':remaining===full?'Start session':'Resume session'}</>}</button><button className="study-reset-button" onClick={reset} disabled={saving} title="Reset timer"><RotateCcw size={15}/></button></div></div></article>
    <div className="study-side"><article className="panel study-mode-panel"><div className="study-panel-heading"><div><span className="eyebrow">PICK YOUR PACE</span><h2>Two ways to focus</h2></div><Timer size={17}/></div><button className={`study-mode-option ${mode==='deep'?'active':''}`} disabled={running||saving||(remaining!==full&&!saved)} onClick={()=>chosen('deep')}><span className="study-mode-number">01</span><span className="study-mode-text"><strong>Deep work</strong><small>90 minutes · one thing at a time</small></span><span className="study-mode-arrow">{mode==='deep'?'●':'○'}</span></button><button className={`study-mode-option ${mode==='rapid'?'active':''}`} disabled={running||saving||(remaining!==full&&!saved)} onClick={()=>chosen('rapid')}><span className="study-mode-number">02</span><span className="study-mode-text"><strong>Rapid learning</strong><small>25 minutes · quick focused sprint</small></span><span className="study-mode-arrow">{mode==='rapid'?'●':'○'}</span></button><form className="study-subject-form" onSubmit={saveSession}><label htmlFor="study-subject">What are you working on?</label><input id="study-subject" value={subject} onChange={e=>setSubject(e.target.value)} disabled={saving} placeholder="A subject, chapter, or question"/><button className="study-save-button" type="submit" disabled={saved||saving||remaining===full}>{saved?<><Check size={14}/> Session saved</>:saving?'Saving…':'Save session so far'}</button></form></article>
    <article className="study-quote-card"><div className="study-quote-spark">✳</div><span>YOUR GENTLE REMINDER</span><p>“It always seems impossible until it’s done.”</p><small>— NELSON MANDELA</small><div className="study-quote-art"><i/><i/><i/></div></article></div></div>
    {error&&<div className="ai-error study-error" role="alert">Could not save your session: {error}</div>}
    <section className="panel study-history"><div className="study-panel-heading"><div><span className="eyebrow">YOUR RECENT SESSIONS</span><h2>Time well spent</h2></div><span className="study-session-total">{entries.length} saved</span></div>{entries.length?entries.slice(0,5).map(entry=><div className="study-history-row" key={entry.id}><span className="study-history-icon"><BookOpen size={15}/></span><div><strong>{entry.title}</strong><small>{String(entry.payload.session_type||'Study session')}</small></div><span className="study-history-duration">{entry.payload.duration?`${entry.payload.duration} min`:'Session'}</span></div>):<div className="study-history-empty"><Sparkles size={17}/><span>Your sessions will collect here as you study.</span></div>}</section>
  </section>
}
