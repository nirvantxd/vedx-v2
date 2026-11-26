import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, ArrowRight, BookOpen, CalendarDays, Check, CheckCheck, ChevronDown, CircleHelp, CreditCard, Dumbbell, Flag, Heart, LayoutDashboard, LogOut, NotebookPen, Plus, Search, Settings2, Sparkles, Target, Utensils, X } from 'lucide-react'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { AIPlanner } from './components/AIPlanner'
import { AuthScreen } from './components/AuthScreen'
import { ProfileSetup, type UserProfile } from './components/ProfileSetup'
import { AreaWorkspace } from './components/AreaWorkspace'
import { MedalsWorkspace } from './components/MedalsWorkspace'
import { StudyWorkspace } from './components/StudyWorkspace'
import { requestReminderPermission, showReminder } from './lib/notifications'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type Task = { id: string; title: string; category: string; time: string; done: boolean; reminderTime: string | null; repeatDaily: boolean; dueDate: string | null; completedOn: string | null }
type Goal = { id: string; title: string; category: string; desired_outcome: string; target_date: string | null; status: string; milestones: Array<{ id: string; title: string; target_date: string | null }> }
const initialTasks: Task[] = []
const localDateKey = (date=new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
type LocalReminder = { reminderTime: string; repeatDaily: boolean; dueDate: string | null; completedOn: string | null }
const reminderStoreKey = (userId: string) => `vedx:local-reminders:${userId}`
function readLocalReminders(userId: string): Record<string, LocalReminder> {
  try { return JSON.parse(localStorage.getItem(reminderStoreKey(userId)) || '{}') as Record<string, LocalReminder> } catch { return {} }
}
function writeLocalReminders(userId: string, reminders: Record<string, LocalReminder>) {
  try { localStorage.setItem(reminderStoreKey(userId), JSON.stringify(reminders)) } catch { /* The Supabase task remains usable without local reminder persistence. */ }
}
const nav = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Tasks', icon: CheckCheck }, { label: 'AI Planner', icon: Sparkles }, { label: 'Habits', icon: Activity },
  { label: 'Goals', icon: Target }, { label: 'Calendar', icon: CalendarDays },
]
const areas = [
  { label: 'Study', icon: BookOpen, color: 'violet' }, { label: 'Fitness', icon: Dumbbell, color: 'green' },
  { label: 'Nutrition', icon: Utensils, color: 'orange' }, { label: 'Finance', icon: CreditCard, color: 'blue' },
  { label: 'Diary', icon: NotebookPen, color: 'rose' }, { label: 'Notes', icon: NotebookPen, color: 'rose' },
  { label: 'Medals', icon: Sparkles, color: 'violet' },
]

type WorkspaceProps = { user: User; profile: UserProfile; client: SupabaseClient; onSignOut: () => void }

function VedXWorkspace({ user, profile, client, onSignOut }: WorkspaceProps) {
  const [active, setActive] = useState('Overview')
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loadError, setLoadError] = useState('')
  const [localReminderFallback, setLocalReminderFallback] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('personal')
  const [newTaskReminder, setNewTaskReminder] = useState('')
  const [newTaskDaily, setNewTaskDaily] = useState(true)
  const [query, setQuery] = useState('')
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const completed = tasks.filter((task) => task.done).length
  const visibleTasks = useMemo(() => tasks.filter((task) => task.title.toLowerCase().includes(query.toLowerCase())), [tasks, query])

  async function refreshRecords() {
    const [taskResult, goalResult, milestoneResult] = await Promise.all([
      client.from('tasks').select('id,title,category,due_date,status,reminder_time,repeat_daily,completed_on').order('created_at', { ascending: false }),
      client.from('goals').select('id,title,category,desired_outcome,target_date,status').order('created_at', { ascending: false }),
      client.from('goal_milestones').select('id,goal_id,title,target_date').order('created_at', { ascending: true }),
    ])
    let taskRows: any[] = taskResult.data || []
    let tasksError = taskResult.error
    if (tasksError && /reminder_time|repeat_daily|completed_on/i.test(tasksError.message)) {
      setLocalReminderFallback(true)
      const fallback = await client.from('tasks').select('id,title,category,due_date,status').order('created_at', { ascending: false })
      const localReminders = readLocalReminders(user.id)
      taskRows = (fallback.data || []).map(task => ({ ...task, reminder_time: localReminders[task.id]?.reminderTime || null, repeat_daily: localReminders[task.id]?.repeatDaily || false, completed_on: localReminders[task.id]?.completedOn || null, due_date: localReminders[task.id]?.dueDate || task.due_date }))
      tasksError = fallback.error
    } else if (!tasksError) setLocalReminderFallback(false)
    const firstError = tasksError || goalResult.error || milestoneResult.error
    if (firstError) { setLoadError(`Could not load your saved Goals and Tasks: ${firstError.message}`); return }
    setLoadError('')
    setTasks(taskRows.map((task: any) => ({ id: task.id, title: task.title, category: task.category, time: task.reminder_time ? new Date(`2000-01-01T${task.reminder_time}`).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : task.due_date || 'Anytime', done: task.status === 'completed' && (!task.repeat_daily || task.completed_on === localDateKey()), reminderTime: task.reminder_time, repeatDaily: task.repeat_daily, dueDate: task.due_date, completedOn: task.completed_on })))
    const milestones = milestoneResult.data || []
    setGoals((goalResult.data || []).map((goal: any) => ({ ...goal, milestones: milestones.filter((milestone: any) => milestone.goal_id === goal.id) })))
  }

  useEffect(() => { void refreshRecords() }, [client])

  useEffect(() => {
    const alerted = new Set<string>()
    const check = () => {
      const now = new Date()
      const day = localDateKey(now)
      const currentTime = now.getHours() * 60 + now.getMinutes()
      for (const task of tasks) {
        if ((task.repeatDaily ? task.completedOn === day : task.done) || !task.reminderTime || (!task.repeatDaily && task.dueDate !== day)) continue
        const [hour, minute] = task.reminderTime.split(':').map(Number)
        const target = hour * 60 + minute
        for (const lead of [30, 5]) {
          const key = `vedx:reminder:${user.id}:${task.id}:${task.reminderTime}:${task.dueDate||'daily'}:${day}:${lead}`
          const deltaSeconds = (currentTime - (target - lead)) * 60 + now.getSeconds()
          if (deltaSeconds >= 0 && deltaSeconds < 60 && !alerted.has(key)) {
            let alreadySent = false
            try { alreadySent = localStorage.getItem(key) === 'sent' } catch { /* Keep in-memory duplicate protection if storage is unavailable. */ }
            if (alreadySent) continue
            alerted.add(key)
            try { localStorage.setItem(key, 'sent') } catch { /* The alert still works for this open app session. */ }
            void showReminder(lead === 5 ? 'Your task starts in 5 minutes' : 'Your task starts in 30 minutes', task.title)
          }
        }
      }
    }
    check()
    const interval = window.setInterval(check, 10000)
    return () => window.clearInterval(interval)
  }, [tasks, user.id])

  useEffect(() => {
    let day = localDateKey()
    const interval = window.setInterval(() => {
      const nextDay = localDateKey()
      if (nextDay === day) return
      day = nextDay
      setTasks(current => current.map(task => task.repeatDaily ? { ...task, done: task.completedOn === nextDay } : task))
    }, 30000)
    return () => window.clearInterval(interval)
  }, [])

  async function toggleTask(task: Task) {
    const status = task.done ? 'pending' : 'completed'
    const completedOn = status === 'completed' ? localDateKey() : null
    setTasks(current => current.map(item => item.id === task.id ? { ...item, done: !item.done, completedOn } : item))
    let { error } = await client.from('tasks').update({ status, completed_on: completedOn }).eq('id', task.id)
    if (error && /completed_on/i.test(error.message)) ({ error } = await client.from('tasks').update({ status }).eq('id', task.id))
    if (localReminderFallback && task.reminderTime) {
      const local = readLocalReminders(user.id)
      local[task.id] = { reminderTime: task.reminderTime, repeatDaily: task.repeatDaily, dueDate: task.dueDate, completedOn }
      writeLocalReminders(user.id, local)
    }
    if (error) { setLoadError(`Could not update task: ${error.message}`); void refreshRecords() }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTask.trim()
    if (!title) return
    let permission = true
    if (newTaskReminder) permission = await requestReminderPermission()
    const dueDate = newTaskReminder && !newTaskDaily ? localDateKey() : null
    let insertResult = await client.from('tasks').insert({ title, category: newTaskCategory, status: 'pending', source: 'manual', due_date: dueDate, reminder_time: newTaskReminder || null, repeat_daily: Boolean(newTaskReminder && newTaskDaily) }).select('id').single()
    if (insertResult.error && /reminder_time|repeat_daily|completed_on/i.test(insertResult.error.message)) {
      insertResult = await client.from('tasks').insert({ title, category: newTaskCategory, status: 'pending', source: 'manual', due_date: dueDate }).select('id').single()
      if (!insertResult.error && newTaskReminder) {
        const local = readLocalReminders(user.id)
        local[insertResult.data.id] = { reminderTime: newTaskReminder, repeatDaily: newTaskDaily, dueDate, completedOn: null }
        writeLocalReminders(user.id, local)
        setLocalReminderFallback(true)
      }
    }
    const error = insertResult.error
    if (error) { setLoadError(/reminder_time|repeat_daily|completed_on/i.test(error.message) ? 'Reminders are not ready yet. Apply the task reminder migration in Supabase, then save this task again.' : `Could not save task: ${error.message}`); return }
    await refreshRecords()
    setNewTask('')
    setNewTaskCategory('personal')
    setNewTaskReminder('')
    setNewTaskDaily(true)
    setShowAdd(false)
    setActive('Tasks')
    if (!permission) setLoadError('Task saved. Turn on VedX notifications in your device settings to receive its reminders.')
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span>v</span></div><span className="brand-name">vedx</span><span className="brand-version">V2</span></div>
      <button className="workspace-switch"><div className="avatar">V</div><span className="workspace-copy"><strong>My space</strong><small>Personal workspace</small></span><ChevronDown size={15} /></button>
      <div className="side-scroll">
        <p className="side-label">WORKSPACE</p>
        <nav className="nav-list">{nav.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${active === label ? 'selected' : ''}`} onClick={() => setActive(label)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'Tasks' && <span className="nav-count">{tasks.filter(t => !t.done).length}</span>}</button>)}</nav>
        <div className="side-divider" /><p className="side-label">YOUR AREAS</p>
        <nav className="nav-list">{areas.map(({ label, icon: Icon, color }) => <button key={label} className={`nav-item ${active === label ? 'selected' : ''}`} onClick={() => setActive(label)}><span className={`area-icon ${color}`}><Icon size={14} strokeWidth={1.9} /></span><span>{label}</span></button>)}</nav>
        <button className="add-area" onClick={() => setActive('Explore areas')}><Plus size={15} /> Add an area</button>
      </div>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setActive('Settings')}><Settings2 size={17} /><span>Settings</span></button><button className="nav-item" onClick={() => setActive('Help')}><CircleHelp size={17} /><span>Help & feedback</span></button><div className="profile-row"><div className="profile-avatar">{(user.email?.[0] || 'V').toUpperCase()}</div><div className="profile-copy"><strong>{user.email || 'VedX account'}</strong><small>Signed in</small></div><button className="profile-signout" aria-label="Sign out" onClick={onSignOut}><LogOut size={16} /></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>VedX space</span><span className="crumb-slash">/</span><strong>{active}</strong></div><div className="top-actions"><div className="today-label"><span className="today-dot" /> {dateLabel}</div><button className="icon-button" aria-label="Search tasks" onClick={() => setActive('Tasks')}><Search size={17} /></button><div className="top-avatar">V</div></div></header>
      <div className="content-wrap">
        {active === 'Overview' ? <>
          <section className="welcome-row"><div><p className="eyebrow">{dateLabel.toUpperCase()}, {new Date().getFullYear()}</p><h1>Welcome to VedX <span className="wave">✳</span></h1><p className="welcome-sub">A little progress each day adds up to big results.</p></div><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={16} /> New task</button></section>
          <section className="focus-banner"><div className="focus-copy"><div className="focus-kicker"><Sparkles size={14} /> YOUR DAILY FOCUS</div><h2>Show up for the things<br />that matter to you.</h2><p>Your plans, habits, and goals — all in one calm space.</p></div><div className="focus-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="sun-shape"/><div className="focus-spark">✦</div><div className="focus-small-star">✳</div></div><div className="focus-watermark">VEDX · PERSONAL OS</div></section>
          <section className="stats-grid"><article className="stat-card"><div className="stat-heading"><span>Tasks completed</span><span className="stat-icon blue"><CheckCheck size={16}/></span></div><div className="stat-value">{tasks.length ? <>{completed}<span>/{tasks.length}</span></> : <>0<span className="stat-neutral"> no tasks yet</span></>}</div>{tasks.length ? <div className="stat-foot"><div className="progress-track"><span style={{width: `${completed / tasks.length * 100}%`}}/></div><small>{Math.round(completed/tasks.length*100)}% of your tasks</small></div> : <div className="stat-foot stat-note">Add a task to start your day</div>}</article><article className="stat-card"><div className="stat-heading"><span>Habit consistency</span><span className="stat-icon orange"><Activity size={16}/></span></div><div className="stat-value">—<span className="stat-neutral"> no habits yet</span></div><div className="stat-foot stat-note">Start with one small habit today</div></article><article className="stat-card"><div className="stat-heading"><span>Active goals</span><span className="stat-icon violet"><Flag size={16}/></span></div><div className="stat-value">{goals.filter(goal => goal.status === 'active').length}<span className="stat-neutral"> active</span></div><div className="stat-foot stat-note">Your saved goals</div></article></section>
          <section className="dashboard-grid"><article className="panel tasks-panel"><div className="panel-heading"><div><h3>Today's tasks</h3><p>A clear mind starts with a clear plan.</p></div><button className="text-button" onClick={() => setActive('Tasks')}>View all <ArrowRight size={14}/></button></div>{loadError && <div className="ai-error" role="alert">{loadError}</div>}<div className="task-list">{tasks.slice(0,4).map((task) => <div className={`task-row ${task.done ? 'task-done' : ''}`} key={task.id}><button aria-label={task.done ? 'Mark incomplete' : 'Complete task'} className={`task-check ${task.done ? 'checked' : ''}`} onClick={() => void toggleTask(task)}>{task.done && <Check size={13}/>}</button><div className="task-title-wrap"><span className="task-title">{task.title}</span><span className="task-category">{task.category}</span></div><span className="task-time">{task.time}</span></div>)}</div><button className="add-task-link" onClick={() => setShowAdd(true)}><Plus size={15}/> Add a task</button></article><article className="panel week-panel"><div className="panel-heading"><div><h3>This week</h3><p>Small steps, steady momentum.</p></div></div><div className="week-empty"><div className="empty-goal-icon"><Activity size={18}/></div><div><strong>Your week starts with one small step.</strong><p>Activity summaries will appear as you use VedX.</p></div><button className="small-outline" onClick={() => setShowAdd(true)}><Plus size={14}/> Plan a task</button></div></article></section>
          <section className="bottom-grid"><article className="panel goal-panel"><div className="panel-heading"><div><h3>Goals in focus</h3><p>The bigger picture starts here.</p></div><button className="text-button" onClick={() => setActive('Goals')}>See goals <ArrowRight size={14}/></button></div>{goals[0] ? <div className="saved-goal"><strong>{goals[0].title}</strong><p>{goals[0].desired_outcome}</p><span className="task-category">{goals[0].category}</span></div> : <div className="empty-goal"><div className="empty-goal-icon"><Target size={20}/></div><div><strong>Your next chapter is unwritten.</strong><p>Create a goal to turn an idea into a plan.</p></div><button className="small-outline" onClick={() => setActive('AI Planner')}><Sparkles size={14}/> Plan with AI</button></div>}</article><article className="quote-panel"><div className="quote-mark">“</div><p>You don't have to see the whole staircase,<br/>just take the first step.</p><span>— MARTIN LUTHER KING JR.</span><div className="quote-decoration">✳</div></article></section>
        </> : active === 'AI Planner' ? <AIPlanner client={client} profile={profile} onSaved={refreshRecords} /> : active === 'Tasks' ? <section className="module-page"><div className="module-title-row"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Tasks</h1><p className="welcome-sub">Keep track of what matters today.</p></div><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={16}/> New task</button></div>{loadError && <div className="ai-error" role="alert">{loadError}</div>}<div className="task-toolbar"><div className="search-field"><Search size={16}/><input id="task-search" autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks"/></div><span className="task-total">{tasks.length} tasks · {completed} completed</span></div><div className="panel full-task-list">{visibleTasks.length ? visibleTasks.map(task=><div className={`task-row ${task.done?'task-done':''}`} key={task.id}><button className={`task-check ${task.done?'checked':''}`} onClick={()=>void toggleTask(task)}>{task.done&&<Check size={13}/>}</button><div className="task-title-wrap"><span className="task-title">{task.title}</span><span className="task-category">{task.category}{task.reminderTime?` · Reminder ${task.time}${task.repeatDaily?' daily':''}`:''}</span></div><span className="task-time">{task.time}</span><button className="task-more" aria-label="Remove task" onClick={async()=>{const {error}=await client.from('tasks').delete().eq('id',task.id);if(error)setLoadError(`Could not remove task: ${error.message}`);else await refreshRecords()}}><X size={15}/></button></div>):<div className="no-results">{query ? "No matching tasks. Try another search." : "No tasks yet. Create one to get started."}</div>}</div></section> : active === 'Goals' ? <section className="module-page"><div className="module-title-row"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Goals</h1><p className="welcome-sub">Your goals and the milestones that move them forward.</p></div><button className="primary-button" onClick={() => setActive('AI Planner')}><Sparkles size={16}/> Plan with AI</button></div>{loadError && <div className="ai-error" role="alert">{loadError}</div>}<div className="saved-goals-list">{goals.length ? goals.map(goal=><article className="panel saved-goal-card" key={goal.id}><div className="saved-goal-heading"><div><span className="task-category">{goal.category}</span><h2>{goal.title}</h2></div><span className="goal-status">{goal.status}</span></div><p>{goal.desired_outcome}</p>{goal.target_date && <small>Target date: {goal.target_date}</small>}{goal.milestones.length > 0 && <div className="goal-milestones"><strong>Milestones</strong>{goal.milestones.map(milestone=><div key={milestone.id}>• {milestone.title}{milestone.target_date ? ` · ${milestone.target_date}` : ''}</div>)}</div>}</article>) : <div className="panel empty-module"><div className="empty-module-icon"><Target size={22}/></div><h2>No goals yet</h2><p>Create a plan with AI and its goals will be saved here automatically.</p><button className="primary-button" onClick={() => setActive('AI Planner')}><Sparkles size={15}/> Make a plan</button></div>}</div></section> : active === 'Study' ? <StudyWorkspace client={client} userId={user.id}/> : active === 'Medals' ? <MedalsWorkspace client={client}/> : ['Fitness','Nutrition','Finance','Diary','Notes','Calendar','Habits'].includes(active) ? <AreaWorkspace area={active} client={client}/> : <section className="module-page module-empty"><div className="module-title-row"><div><p className="eyebrow">YOUR PERSONAL OS</p><h1>{active}</h1><p className="welcome-sub">A thoughtful space for the things that matter.</p></div></div><div className="panel empty-module"><div className="empty-module-icon"><Heart size={22}/></div><h2>{`${active} is part of your VedX foundation.`}</h2><p>This area will become part of your personal system as the next product modules are built. Your VedX workspace is ready to grow with you.</p><button className="text-button" onClick={() => setActive('Overview')}>Back to overview <ArrowRight size={14}/></button></div></section>}
        <footer className="app-footer"><span>Made for a life in progress.</span><span>VEDX <b>·</b> PRIVATE BY DESIGN</span></footer>
      </div>
    </main>
    {showAdd && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false)}}><form className="task-modal reminder-modal" onSubmit={addTask}><div className="modal-heading"><div><p className="eyebrow">MAKE A LITTLE PROGRESS</p><h2>New task</h2></div><button type="button" className="icon-button" onClick={()=>setShowAdd(false)} aria-label="Close"><X size={18}/></button></div><label htmlFor="new-task">What needs doing?</label><input id="new-task" autoFocus value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="e.g. Study for three hours"/><label htmlFor="new-task-category">Area</label><select className="area-input" id="new-task-category" value={newTaskCategory} onChange={e=>setNewTaskCategory(e.target.value)}>{['personal','study','fitness','nutrition','finance','career','wellbeing','other'].map(item=><option key={item} value={item}>{item[0].toUpperCase()+item.slice(1)}</option>)}</select><label htmlFor="new-task-reminder">Reminder time</label><input className="area-input" id="new-task-reminder" type="time" value={newTaskReminder} onChange={e=>setNewTaskReminder(e.target.value)}/>{newTaskReminder&&<label className="daily-reminder-check"><input type="checkbox" checked={newTaskDaily} onChange={e=>setNewTaskDaily(e.target.checked)}/> Repeat this reminder every day</label>}{newTaskReminder&&<p className="reminder-preview">VedX will remind you at {new Date(`2000-01-01T${newTaskReminder}`).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}, then again 5 minutes before.</p>}<div className="modal-actions"><button type="button" className="cancel-button" onClick={()=>setShowAdd(false)}>Cancel</button><button className="primary-button" disabled={!newTask.trim()}><Plus size={15}/> Save task</button></div></form></div>}
  </div>
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) {
      setProfile(null)
      setProfileLoading(false)
      setProfileError('')
      return
    }
    let active = true
    setProfileLoading(true)
    setProfileError('')
    void supabase.from('profiles').select('user_id,name,age,profession').eq('user_id', session.user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return
      if (error) setProfileError(`Could not load your profile: ${error.message}`)
      else setProfile(data as UserProfile | null)
      setProfileLoading(false)
    })
    return () => { active = false }
  }, [session?.user.id])

  if (!isSupabaseConfigured || !supabase) return <AuthScreen client={null} configured={false} />
  const activeClient = supabase
  if (loading) return <main className="auth-screen"><p className="auth-loading">Loading your secure VedX session…</p></main>
  if (!session) return <AuthScreen client={activeClient} configured />
  if (profileLoading) return <main className="auth-screen"><p className="auth-loading">Loading your profile…</p></main>
  if (profileError) return <main className="auth-screen"><section className="auth-card"><h1>Profile unavailable</h1><p className="auth-error" role="alert">{profileError}</p><p className="auth-privacy">Apply the profiles database migration, then reopen VedX.</p><button className="primary-button" onClick={() => { void activeClient.auth.signOut() }}>Sign out</button></section></main>
  if (!profile) return <ProfileSetup client={activeClient} user={session.user} onSaved={setProfile} />
  return <VedXWorkspace user={session.user} profile={profile} client={activeClient} onSignOut={() => { void activeClient.auth.signOut() }} />
}

export default App
