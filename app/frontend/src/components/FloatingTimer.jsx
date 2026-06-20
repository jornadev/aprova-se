import { useState, useEffect, useRef } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import { sessionApi, subjectApi } from '../services/api'
import { useToast } from '../context/ToastContext'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}min`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTimeFull(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const LS_KEY = 'aprovase_timer'
const EMPTY_FORM = { subjectId: '', content: '', correctAnswers: '', wrongAnswers: '', manualMinutes: '' }
const DEFAULT_POMODORO = { work: 25, shortBreak: 5, longBreak: 15, cyclesBeforeLong: 4 }

const PHASE = {
  work:        { label: 'Foco',        color: '#7c3aed', glow: 'rgba(124,58,237,0.13)' },
  short_break: { label: 'Pausa Curta', color: '#22c55e', glow: 'rgba(34,197,94,0.10)' },
  long_break:  { label: 'Pausa Longa', color: '#10b981', glow: 'rgba(16,185,129,0.10)' },
}

function MinimizeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

function Ring({ timeLeft, total, phase, large = false }) {
  const r     = large ? 110 : 52
  const dim   = large ? 280 : 140
  const sw    = large ? 10  : 10
  const circ  = 2 * Math.PI * r
  const pct   = total > 0 ? Math.max(0, timeLeft / total) : 0
  const color = PHASE[phase]?.color || '#7c3aed'
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke="#0f172a" strokeWidth={sw} />
        <circle
          cx={dim/2} cy={dim/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1">
        <span
          className="font-mono font-bold text-white tabular-nums leading-none"
          style={{ fontSize: large ? '3.8rem' : '28px' }}
        >
          {formatTime(timeLeft)}
        </span>
        <span
          className="uppercase tracking-widest font-bold"
          style={{ color, fontSize: large ? '11px' : '9px', marginTop: large ? 6 : 4 }}
        >
          {PHASE[phase]?.label}
        </span>
      </div>
    </div>
  )
}

function CycleDots({ pomCompleted, cyclesBeforeLong, pomPhase }) {
  const cyclePos = pomCompleted % cyclesBeforeLong
  return (
    <div className="flex items-center gap-2.5">
      {Array.from({ length: cyclesBeforeLong }).map((_, i) => {
        const filled  = i < cyclePos
        const current = pomPhase === 'work' && i === cyclePos
        return (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${current ? 'animate-pulse' : ''}`}
            style={{
              width:  current ? 13 : 9,
              height: current ? 13 : 9,
              background: filled
                ? PHASE.work.color
                : current ? `${PHASE.work.color}55` : '#334155',
            }}
          />
        )
      })}
      {pomCompleted > 0 && (
        <span className="text-[11px] text-slate-500 ml-1 tabular-nums">{pomCompleted}×</span>
      )}
    </div>
  )
}

export default function FloatingTimer() {
  const toast = useToast()
  // state: idle | choosing | fullscreen | running | pomfullscreen | pomodoro | saving | manual
  const [state, setState] = useState('idle')
  const [mode, setMode]   = useState(null)

  const [elapsed, setElapsed]     = useState(0)
  const [startedAt, setStartedAt] = useState(null)

  const [pomPhase,     setPomPhase]     = useState('work')
  const [pomTimeLeft,  setPomTimeLeft]  = useState(0)
  const [pomCompleted, setPomCompleted] = useState(0)
  const [pomWorkSecs,  setPomWorkSecs]  = useState(0)
  const [pomConfig,    setPomConfig]    = useState(DEFAULT_POMODORO)
  const [pomDraft,     setPomDraft]     = useState(DEFAULT_POMODORO)

  const pomRef = useRef({ phase: 'work', timeLeft: 0, completed: 0, workSecs: 0, config: DEFAULT_POMODORO })

  const [subjects, setSubjects] = useState([])
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const freeIntervalRef = useRef(null)
  const pomIntervalRef  = useRef(null)

  useEffect(() => {
    subjectApi.getAll().then(setSubjects)
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.mode === 'free') {
        const start = new Date(d.startedAt)
        const secs  = Math.floor((Date.now() - start.getTime()) / 1000)
        setStartedAt(start); setElapsed(secs); setMode('free'); setState('running')
      } else if (d.mode === 'pomodoro') {
        const cfg      = d.config || DEFAULT_POMODORO
        const deadline = d.phaseDeadline || Date.now()
        const tl       = Math.max(0, Math.floor((deadline - Date.now()) / 1000))
        const phase    = tl === 0 ? 'work' : (d.phase || 'work')
        const timeLeft = tl === 0 ? cfg.work * 60 : tl
        const s = { phase, timeLeft, completed: d.completed || 0, workSecs: d.workSecs || 0, config: cfg }
        pomRef.current = s
        setPomPhase(phase); setPomTimeLeft(timeLeft); setPomCompleted(s.completed)
        setPomWorkSecs(s.workSecs); setPomConfig(cfg); setPomDraft(cfg)
        setMode('pomodoro'); setState('pomodoro')
      }
    } catch {}
  }, [])

  // Free timer tick
  useEffect(() => {
    if (state === 'fullscreen' || state === 'running') {
      freeIntervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(freeIntervalRef.current)
    }
    return () => clearInterval(freeIntervalRef.current)
  }, [state])

  // Pomodoro tick
  useEffect(() => {
    if (state !== 'pomodoro' && state !== 'pomfullscreen') {
      clearInterval(pomIntervalRef.current)
      return
    }
    pomIntervalRef.current = setInterval(() => {
      const s    = pomRef.current
      const newTL = s.timeLeft - 1
      if (newTL <= 0) {
        let nextPhase, nextCompleted, nextWorkSecs
        if (s.phase === 'work') {
          nextCompleted = s.completed + 1
          nextWorkSecs  = s.workSecs + s.config.work * 60
          nextPhase     = nextCompleted % s.config.cyclesBeforeLong === 0 ? 'long_break' : 'short_break'
        } else {
          nextCompleted = s.completed; nextWorkSecs = s.workSecs; nextPhase = 'work'
        }
        const dur  = phaseDuration(nextPhase, s.config)
        const next = { phase: nextPhase, timeLeft: dur, completed: nextCompleted, workSecs: nextWorkSecs, config: s.config }
        pomRef.current = next
        setPomPhase(nextPhase); setPomTimeLeft(dur); setPomCompleted(nextCompleted); setPomWorkSecs(nextWorkSecs)
        persistPom(next); triggerNotification(nextPhase)
      } else {
        pomRef.current = { ...s, timeLeft: newTL }
        setPomTimeLeft(newTL)
      }
    }, 1000)
    return () => clearInterval(pomIntervalRef.current)
  }, [state])

  function phaseDuration(phase, cfg) {
    if (phase === 'work') return cfg.work * 60
    if (phase === 'short_break') return cfg.shortBreak * 60
    return cfg.longBreak * 60
  }

  function persistPom(s) {
    localStorage.setItem(LS_KEY, JSON.stringify({
      mode: 'pomodoro', phase: s.phase,
      phaseDeadline: Date.now() + s.timeLeft * 1000,
      completed: s.completed, workSecs: s.workSecs, config: s.config,
    }))
  }

  function triggerNotification(phase) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    new Notification(phase === 'work' ? 'Hora de focar!' : 'Hora de descansar!', { body: PHASE[phase].label })
  }

  const startFree = () => {
    const now = new Date()
    setStartedAt(now); setElapsed(0); setMode('free'); setState('fullscreen')
    localStorage.setItem(LS_KEY, JSON.stringify({ mode: 'free', startedAt: now.toISOString() }))
  }

  const startPomodoro = () => {
    const cfg = pomDraft
    const s   = { phase: 'work', timeLeft: cfg.work * 60, completed: 0, workSecs: 0, config: cfg }
    pomRef.current = s
    setPomPhase('work'); setPomTimeLeft(cfg.work * 60); setPomCompleted(0); setPomWorkSecs(0)
    setPomConfig(cfg); setStartedAt(new Date()); setMode('pomodoro'); setState('pomfullscreen')
    persistPom(s)
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }

  const stopFree      = () => setState('saving')
  const stopPomodoro  = () => {
    const s = pomRef.current
    const currentWork = s.phase === 'work' ? Math.max(0, s.config.work * 60 - s.timeLeft) : 0
    setElapsed(s.workSecs + currentWork); setState('saving')
  }

  const skipPhase = () => {
    const s = pomRef.current
    let nextPhase, nextCompleted, nextWorkSecs
    if (s.phase === 'work') {
      nextCompleted = s.completed + 1; nextWorkSecs = s.workSecs
      nextPhase = nextCompleted % s.config.cyclesBeforeLong === 0 ? 'long_break' : 'short_break'
    } else {
      nextCompleted = s.completed; nextWorkSecs = s.workSecs; nextPhase = 'work'
    }
    const dur  = phaseDuration(nextPhase, s.config)
    const next = { phase: nextPhase, timeLeft: dur, completed: nextCompleted, workSecs: nextWorkSecs, config: s.config }
    pomRef.current = next
    setPomPhase(nextPhase); setPomTimeLeft(dur); setPomCompleted(nextCompleted); setPomWorkSecs(nextWorkSecs)
    persistPom(next)
  }

  const handleSave = async () => {
    if (!form.subjectId) return
    const isManual = state === 'manual'
    if (isManual && !form.manualMinutes) return
    setSaving(true)
    try {
      const durationMinutes = isManual ? Math.max(1, +form.manualMinutes) : Math.max(1, Math.floor(elapsed / 60))
      const sessionStart    = isManual
        ? new Date(Date.now() - durationMinutes * 60 * 1000)
        : startedAt || new Date(Date.now() - elapsed * 1000)
      await sessionApi.create({
        subject: { id: +form.subjectId },
        startedAt: sessionStart.toISOString().slice(0, 19),
        duration: durationMinutes,
        content: form.content || null,
        correctAnswers: form.correctAnswers ? +form.correctAnswers : null,
        wrongAnswers:   form.wrongAnswers   ? +form.wrongAnswers   : null,
      })
      window.dispatchEvent(new Event('sessionSaved'))
      reset()
      toast.success('Sessão registrada!')
    } catch {
      toast.error('Erro ao salvar sessão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    localStorage.removeItem(LS_KEY)
    setState('idle'); setMode(null); setElapsed(0); setStartedAt(null); setForm(EMPTY_FORM)
    pomRef.current = { phase: 'work', timeLeft: 0, completed: 0, workSecs: 0, config: pomDraft }
    setPomPhase('work'); setPomTimeLeft(0); setPomCompleted(0); setPomWorkSecs(0)
  }

  const selectedSubject = subjects.find(s => s.id === +form.subjectId)
  const pomTotalSecs    = phaseDuration(pomPhase, pomConfig)
  const todayLabel      = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const phaseGlow       = PHASE[pomPhase]?.glow || PHASE.work.glow
  const phaseColor      = PHASE[pomPhase]?.color || PHASE.work.color

  return (
    <>
      {/* ── FULLSCREEN — Sessão Livre ── */}
      {state === 'fullscreen' && (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: `radial-gradient(ellipse at 50% 42%, ${PHASE.work.glow} 0%, #0f172a 62%)` }}
        >
          <div className="flex items-center justify-between px-8 pt-7">
            <span className="text-violet-400 font-bold text-lg tracking-tight">aprova.se</span>
            <button
              onClick={() => setState('running')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
            >
              <MinimizeIcon /> Minimizar
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-6 select-none">
            <div className="flex items-center gap-2.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-violet-300 text-xs uppercase tracking-[0.18em] font-semibold">
                Sessão em andamento
              </span>
            </div>

            <div
              className="font-mono font-bold text-white tabular-nums leading-none"
              style={{
                fontSize: 'clamp(5rem, 18vw, 11rem)',
                letterSpacing: '-0.03em',
                textShadow: '0 0 120px rgba(124,58,237,0.35)',
              }}
            >
              {formatTimeFull(elapsed)}
            </div>

            <p className="text-slate-600 text-sm capitalize">{todayLabel}</p>
          </div>

          <div className="flex items-center justify-center gap-4 pb-12">
            <button
              onClick={stopFree}
              className="px-10 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            >
              Encerrar sessão
            </button>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN — Pomodoro ── */}
      {state === 'pomfullscreen' && (
        <div
          className="fixed inset-0 z-[100] flex flex-col transition-all duration-700"
          style={{ background: `radial-gradient(ellipse at 50% 42%, ${phaseGlow} 0%, #0f172a 65%)` }}
        >
          <div className="flex items-center justify-between px-8 pt-7">
            <span className="font-bold text-lg tracking-tight" style={{ color: phaseColor }}>aprova.se</span>
            <button
              onClick={() => setState('pomodoro')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
            >
              <MinimizeIcon /> Minimizar
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-7 select-none">
            {/* Cycle dots */}
            <CycleDots
              pomCompleted={pomCompleted}
              cyclesBeforeLong={pomConfig.cyclesBeforeLong}
              pomPhase={pomPhase}
            />

            {/* Big ring */}
            <div style={{ filter: `drop-shadow(0 0 40px ${phaseColor}33)` }}>
              <Ring timeLeft={pomTimeLeft} total={pomTotalSecs} phase={pomPhase} large />
            </div>

            {/* Acumulado */}
            {pomWorkSecs > 0 && (
              <p className="text-slate-500 text-sm">
                {formatTime(pomWorkSecs)} de foco acumulados
              </p>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center justify-center gap-3 pb-12">
            <button
              onClick={skipPhase}
              className="px-8 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all hover:scale-105 active:scale-95 border border-slate-700"
            >
              Pular fase
            </button>
            <button
              onClick={stopPomodoro}
              className="px-8 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            >
              Encerrar sessão
            </button>
          </div>
        </div>
      )}

      {/* ── Floating widgets (minimizados) ── */}
      <div data-tour="floating-timer" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Free minimizado */}
        {state === 'running' && (
          <div className="bg-[#0f172a] border border-violet-500/40 rounded-2xl shadow-2xl p-4 flex flex-col items-center gap-3 w-52 ring-1 ring-violet-500/10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-xs text-violet-400 uppercase tracking-widest font-medium">Estudando</span>
              </div>
              <button onClick={() => setState('fullscreen')} title="Expandir" className="text-slate-500 hover:text-slate-300 transition-colors">
                <MinimizeIcon />
              </button>
            </div>
            <span className="text-4xl font-mono font-bold text-white tabular-nums leading-none">
              {formatTime(elapsed)}
            </span>
            <button onClick={stopFree} className="w-full py-2 rounded-xl bg-red-500 hover:bg-red-400 active:scale-95 text-white text-xs font-semibold transition-all">
              ■ Encerrar
            </button>
          </div>
        )}

        {/* Pomodoro minimizado */}
        {state === 'pomodoro' && (
          <div className="bg-[#0f172a] border border-slate-700/70 rounded-2xl shadow-2xl p-5 flex flex-col items-center gap-4 w-64">
            <div className="flex items-center justify-between w-full">
              <CycleDots
                pomCompleted={pomCompleted}
                cyclesBeforeLong={pomConfig.cyclesBeforeLong}
                pomPhase={pomPhase}
              />
              <button onClick={() => setState('pomfullscreen')} title="Expandir" className="text-slate-500 hover:text-slate-300 transition-colors ml-2">
                <MinimizeIcon />
              </button>
            </div>
            <Ring timeLeft={pomTimeLeft} total={pomTotalSecs} phase={pomPhase} />
            {pomWorkSecs > 0 && (
              <p className="text-[11px] text-slate-500 -mt-1">{formatTime(pomWorkSecs)} de foco acumulados</p>
            )}
            <div className="flex gap-2 w-full">
              <button onClick={skipPhase} className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all active:scale-95">Pular</button>
              <button onClick={stopPomodoro} className="flex-1 py-2 rounded-xl border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all active:scale-95">Encerrar</button>
            </div>
          </div>
        )}

        {/* FAB */}
        <div className="flex items-center gap-2">
          {state === 'idle' && (
            <button onClick={() => setState('manual')} title="Registrar sessão manualmente"
              className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-200 text-xl font-light transition-all hover:scale-110 active:scale-95 shadow-lg">
              +
            </button>
          )}
          {state === 'idle' && (
            <button onClick={() => setState('choosing')} title="Iniciar sessão de estudo"
              className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white text-2xl transition-all hover:scale-110 active:scale-95 bg-violet-600 hover:bg-violet-500">
              ▶
            </button>
          )}
        </div>
      </div>

      {/* Modal — escolha do modo */}
      <Modal open={state === 'choosing'} onClose={() => setState('idle')} title="Como você quer estudar?">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border-2 border-violet-500/50 bg-violet-500/8 p-4 flex flex-col items-center gap-3 text-center">
              <div className="w-11 h-11 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Pomodoro</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">Ciclos de foco com pausas</p>
              </div>
            </div>
            <button onClick={startFree}
              className="rounded-xl border-2 border-slate-600/70 bg-slate-700/25 hover:bg-slate-700/50 p-4 flex flex-col items-center gap-3 text-center transition-all group active:scale-95">
              <div className="w-11 h-11 rounded-full bg-slate-600/50 group-hover:bg-slate-600/80 flex items-center justify-center transition-all">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Sessão Livre</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">Cronômetro em tela cheia</p>
              </div>
            </button>
          </div>

          <div className="border border-violet-500/20 rounded-xl p-4 space-y-4 bg-violet-500/5">
            <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">Configuração do Pomodoro</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'work',             label: 'Foco (min)',             min: 1, max: 90 },
                { key: 'shortBreak',       label: 'Pausa curta (min)',      min: 1, max: 30 },
                { key: 'longBreak',        label: 'Pausa longa (min)',      min: 1, max: 60 },
                { key: 'cyclesBeforeLong', label: 'Ciclos p/ pausa longa', min: 2, max: 8  },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1">{label}</label>
                  <input type="number" min={min} max={max} value={pomDraft[key]}
                    onChange={e => setPomDraft(c => ({ ...c, [key]: Math.min(max, Math.max(min, +e.target.value || min)) }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 tabular-nums"
                  />
                </div>
              ))}
            </div>
            <button onClick={startPomodoro}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20">
              Iniciar Pomodoro
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal — salvar sessão */}
      <Modal open={state === 'saving' || state === 'manual'} onClose={reset}
        title={state === 'manual' ? 'Registrar sessão manual' : 'Salvar sessão de estudo'}>
        <div className="space-y-4">
          {state === 'manual' ? (
            <Input label="Duração (minutos) *" type="number" min={1} value={form.manualMinutes}
              onChange={e => setForm(f => ({ ...f, manualMinutes: e.target.value }))} placeholder="Ex: 45" autoFocus />
          ) : (
            <div className="bg-slate-800 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                {mode === 'pomodoro' ? 'Tempo de foco registrado' : 'Tempo registrado'}
              </p>
              <p className="text-4xl font-mono font-bold text-white">{formatTime(elapsed)}</p>
              {mode === 'pomodoro' && pomCompleted > 0 && (
                <p className="text-xs text-violet-400 mt-1.5">
                  {pomCompleted} pomodoro{pomCompleted !== 1 ? 's' : ''} concluído{pomCompleted !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Disciplina <span className="text-red-400">*</span></label>
            <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus={state !== 'manual'}>
              <option value="">Selecione a disciplina estudada...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSubject && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: selectedSubject.color }} />
                <span className="text-xs text-slate-400">{selectedSubject.name}</span>
              </div>
            )}
          </div>

          <Input label="O que você estudou? (opcional)" value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Ex: Capítulo 5 — Verbos irregulares" />

          <div className="grid grid-cols-2 gap-3">
            <Input label="✓ Acertos" type="number" min={0} value={form.correctAnswers}
              onChange={e => setForm(f => ({ ...f, correctAnswers: e.target.value }))} placeholder="0" />
            <Input label="✗ Erros" type="number" min={0} value={form.wrongAnswers}
              onChange={e => setForm(f => ({ ...f, wrongAnswers: e.target.value }))} placeholder="0" />
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave}
              disabled={!form.subjectId || saving || (state === 'manual' && !form.manualMinutes)}
              className="flex-1" variant="success">
              {saving ? 'Salvando...' : 'Salvar sessão'}
            </Button>
            <Button variant="danger" onClick={reset} className="flex-1">Descartar</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
