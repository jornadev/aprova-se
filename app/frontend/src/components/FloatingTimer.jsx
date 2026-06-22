import { useState, useEffect, useRef } from 'react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import { sessionApi, subjectApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'

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

function Ring({ timeLeft, total, phase, large = false, isDark = true }) {
  const r     = large ? 110 : 52
  const dim   = large ? 280 : 140
  const sw    = large ? 10  : 10
  const circ  = 2 * Math.PI * r
  const pct   = total > 0 ? Math.max(0, timeLeft / total) : 0
  const color = PHASE[phase]?.color || '#7c3aed'
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke={isDark ? '#1e293b' : '#ddd6fe'} strokeWidth={sw} />
        <circle
          cx={dim/2} cy={dim/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s linear' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1">
        <span
          className="font-mono font-bold tabular-nums leading-none"
          style={{ fontSize: large ? '3.8rem' : '28px', color: 'var(--text)' }}
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

function CycleDots({ pomCompleted, cyclesBeforeLong, pomPhase, isDark = true }) {
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
                : current ? `${PHASE.work.color}55` : (isDark ? '#334155' : '#cbd5e1'),
            }}
          />
        )
      })}
      {pomCompleted > 0 && (
        <span className="text-[11px] ml-1 tabular-nums" style={{ color: 'var(--text-mut)' }}>{pomCompleted}×</span>
      )}
    </div>
  )
}

export default function FloatingTimer() {
  const toast = useToast()
  const { isDark } = useTheme()
  // state: idle | choosing | fullscreen | running | pomfullscreen | pomodoro | saving | manual
  const [state, setState] = useState('idle')
  const [mode, setMode]   = useState(null)

  const [elapsed, setElapsed]     = useState(0)
  const [startedAt, setStartedAt] = useState(null)
  const [paused, setPaused]             = useState(false)
  const [pausedAt, setPausedAt]         = useState(null)
  const [totalPausedMs, setTotalPausedMs] = useState(0)

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
        const savedPausedMs = d.totalPausedMs || 0
        if (d.paused && d.pausedAt) {
          const secs = Math.floor((d.pausedAt - start.getTime() - savedPausedMs) / 1000)
          setStartedAt(start); setElapsed(Math.max(0, secs)); setMode('free'); setState('running')
          setPaused(true); setPausedAt(d.pausedAt); setTotalPausedMs(savedPausedMs)
        } else {
          const secs = Math.floor((Date.now() - start.getTime() - savedPausedMs) / 1000)
          setStartedAt(start); setElapsed(Math.max(0, secs)); setMode('free'); setState('running')
          setTotalPausedMs(savedPausedMs)
        }
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

  // Free timer tick — timestamp-based so background tabs don't drift
  useEffect(() => {
    if ((state === 'fullscreen' || state === 'running') && !paused && startedAt) {
      const tick = () => {
        const totalMs = Date.now() - startedAt.getTime() - totalPausedMs
        setElapsed(Math.max(0, Math.floor(totalMs / 1000)))
      }
      tick()
      freeIntervalRef.current = setInterval(tick, 1000)
    } else {
      clearInterval(freeIntervalRef.current)
    }
    return () => clearInterval(freeIntervalRef.current)
  }, [state, paused, startedAt, totalPausedMs])

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
    setPaused(false); setPausedAt(null); setTotalPausedMs(0)
    localStorage.setItem(LS_KEY, JSON.stringify({ mode: 'free', startedAt: now.toISOString(), totalPausedMs: 0 }))
  }

  const pauseFree = () => {
    const now = Date.now()
    setPaused(true)
    setPausedAt(now)
    localStorage.setItem(LS_KEY, JSON.stringify({
      mode: 'free', startedAt: startedAt.toISOString(),
      paused: true, pausedAt: now, totalPausedMs
    }))
  }

  const resumeFree = () => {
    const newTotalPaused = totalPausedMs + (Date.now() - pausedAt)
    setTotalPausedMs(newTotalPaused)
    setPaused(false)
    setPausedAt(null)
    localStorage.setItem(LS_KEY, JSON.stringify({
      mode: 'free', startedAt: startedAt.toISOString(),
      paused: false, pausedAt: null, totalPausedMs: newTotalPaused
    }))
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
    setPaused(false); setPausedAt(null); setTotalPausedMs(0)
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
          style={{ background: isDark ? '#0a0e1a' : '#f1f0fb' }}
        >
          <div className="flex items-center justify-between px-8 pt-7">
            <span className="text-violet-400 font-bold text-lg tracking-tight">aprova.se</span>
            <button
              onClick={() => setState('running')}
              className="flex items-center gap-2 transition-colors text-sm"
              style={{ color: isDark ? '#64748b' : '#94a3b8' }}
            >
              <MinimizeIcon /> Minimizar
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-5 select-none">
            <p className="text-sm capitalize font-medium" style={{ color: isDark ? '#475569' : '#94a3b8' }}>{todayLabel}</p>

            <div className={`flex items-center gap-2.5 ${paused ? 'bg-amber-500/10 border-amber-500/20' : 'bg-violet-500/10 border-violet-500/20'} border rounded-full px-4 py-1.5`}>
              {paused
                ? <span className="w-2 h-2 rounded-full bg-amber-400" />
                : <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              }
              <span className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: paused ? '#fbbf24' : '#a78bfa' }}>
                {paused ? 'Sessão pausada' : 'Sessão em andamento'}
              </span>
            </div>

            <div
              className="font-mono font-bold tabular-nums leading-none"
              style={{
                fontSize: 'clamp(5rem, 18vw, 11rem)',
                letterSpacing: '-0.03em',
                color: isDark ? '#ffffff' : '#1e1b4b',
                textShadow: isDark ? '0 0 120px rgba(124,58,237,0.35)' : '0 0 80px rgba(124,58,237,0.12)',
              }}
            >
              {formatTimeFull(elapsed)}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pb-12">
            <button
              onClick={paused ? resumeFree : pauseFree}
              className="px-10 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: paused
                  ? (isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)')
                  : (isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.08)'),
                border: paused ? '1px solid rgba(139,92,246,0.25)' : '1px solid rgba(251,191,36,0.25)',
                color: paused ? '#a78bfa' : '#fbbf24',
              }}
            >
              {paused ? 'Retomar' : 'Pausar'}
            </button>
            <button
              onClick={stopFree}
              className="px-10 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
              }}
            >
              Encerrar sessão
            </button>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN — Pomodoro ── */}
      {state === 'pomfullscreen' && (
        <div
          className="fixed inset-0 z-[100] flex flex-col transition-colors duration-700"
          style={{ background: isDark ? '#0a0e1a' : '#f1f0fb' }}
        >
          <div className="flex items-center justify-between px-8 pt-7">
            <span className="font-bold text-lg tracking-tight" style={{ color: phaseColor }}>aprova.se</span>
            <button
              onClick={() => setState('pomodoro')}
              className="flex items-center gap-2 transition-colors text-sm"
              style={{ color: isDark ? '#64748b' : '#94a3b8' }}
            >
              <MinimizeIcon /> Minimizar
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-7 select-none">
            <p className="text-sm capitalize font-medium" style={{ color: isDark ? '#475569' : '#94a3b8' }}>{todayLabel}</p>

            <CycleDots
              pomCompleted={pomCompleted}
              cyclesBeforeLong={pomConfig.cyclesBeforeLong}
              pomPhase={pomPhase}
              isDark={isDark}
            />

            <div style={{ filter: isDark ? `drop-shadow(0 0 40px ${phaseColor}33)` : 'none' }}>
              <Ring timeLeft={pomTimeLeft} total={pomTotalSecs} phase={pomPhase} large isDark={isDark} />
            </div>

            {pomWorkSecs > 0 && (
              <p className="text-sm" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                {formatTime(pomWorkSecs)} de foco acumulados
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pb-12">
            <button
              onClick={skipPhase}
              className="px-8 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: isDark ? '#1e293b' : '#e2e8f0', border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`, color: isDark ? '#cbd5e1' : '#475569' }}
            >
              Pular fase
            </button>
            <button
              onClick={stopPomodoro}
              className="px-8 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
              }}
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
          <div className="rounded-2xl shadow-2xl p-4 flex flex-col items-center gap-3 w-52 ring-1 ring-violet-500/10"
            style={{ background: 'var(--bg-card)', border: `1px solid ${paused ? 'rgba(251,191,36,0.4)' : 'rgba(139,92,246,0.4)'}` }}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                {paused
                  ? <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                }
                <span className={`text-xs uppercase tracking-widest font-medium ${paused ? 'text-amber-400' : 'text-violet-400'}`}>
                  {paused ? 'Pausado' : 'Estudando'}
                </span>
              </div>
              <button onClick={() => setState('fullscreen')} title="Expandir" className="transition-colors" style={{ color: 'var(--text-mut)' }}>
                <MinimizeIcon />
              </button>
            </div>
            <span className="text-4xl font-mono font-bold tabular-nums leading-none" style={{ color: 'var(--text)' }}>
              {formatTime(elapsed)}
            </span>
            <div className="flex gap-2 w-full">
              <button
                onClick={paused ? resumeFree : pauseFree}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  paused
                    ? 'bg-violet-500 hover:bg-violet-400 text-white'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25'
                }`}
              >
                {paused ? 'Retomar' : 'Pausar'}
              </button>
              <button onClick={stopFree} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-400 active:scale-95 text-white text-xs font-semibold transition-all">
                Encerrar
              </button>
            </div>
          </div>
        )}

        {/* Pomodoro minimizado */}
        {state === 'pomodoro' && (
          <div className="rounded-2xl shadow-2xl p-5 flex flex-col items-center gap-4 w-64"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr)' }}>
            <div className="flex items-center justify-between w-full">
              <CycleDots
                pomCompleted={pomCompleted}
                cyclesBeforeLong={pomConfig.cyclesBeforeLong}
                pomPhase={pomPhase}
                isDark={isDark}
              />
              <button onClick={() => setState('pomfullscreen')} title="Expandir" className="transition-colors ml-2" style={{ color: 'var(--text-mut)' }}>
                <MinimizeIcon />
              </button>
            </div>
            <Ring timeLeft={pomTimeLeft} total={pomTotalSecs} phase={pomPhase} isDark={isDark} />
            {pomWorkSecs > 0 && (
              <p className="text-[11px] -mt-1" style={{ color: 'var(--text-mut)' }}>{formatTime(pomWorkSecs)} de foco acumulados</p>
            )}
            <div className="flex gap-2 w-full">
              <button onClick={skipPhase} className="flex-1 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
                style={{ background: isDark ? '#1e293b' : '#e2e8f0', color: 'var(--text-3)' }}>Pular</button>
              <button onClick={stopPomodoro} className="flex-1 py-2 rounded-xl border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all active:scale-95">Encerrar</button>
            </div>
          </div>
        )}

        {/* FAB */}
        <div className="flex items-center gap-2">
          {state === 'idle' && (
            <button onClick={() => setState('manual')} title="Registrar sessão manualmente"
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-light transition-all hover:scale-110 active:scale-95 shadow-lg"
              style={{ background: isDark ? '#334155' : '#e2e8f0', color: 'var(--text-2)' }}>
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
            <div className="rounded-xl border-2 border-violet-500/50 p-4 flex flex-col items-center gap-3 text-center"
              style={{ background: 'rgba(139,92,246,0.08)' }}>
              <div className="w-11 h-11 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Pomodoro</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-fad)' }}>Ciclos de foco com pausas</p>
              </div>
            </div>
            <button onClick={startFree}
              className="rounded-xl border-2 p-4 flex flex-col items-center gap-3 text-center transition-all group active:scale-95"
              style={{ borderColor: 'var(--bdr)', background: isDark ? 'rgba(51,65,85,0.25)' : 'rgba(226,232,240,0.5)' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                style={{ background: isDark ? 'rgba(71,85,105,0.5)' : 'rgba(203,213,225,0.6)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--text-3)' }}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sessão Livre</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--text-fad)' }}>Cronômetro em tela cheia</p>
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
                  <label className="text-xs block mb-1" style={{ color: 'var(--text-fad)' }}>{label}</label>
                  <input type="number" min={min} max={max} value={pomDraft[key]}
                    onChange={e => setPomDraft(c => ({ ...c, [key]: Math.min(max, Math.max(min, +e.target.value || min)) }))}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm tabular-nums transition-colors"
                    style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}
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
            <div className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-elev)' }}>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-fad)' }}>
                {mode === 'pomodoro' ? 'Tempo de foco registrado' : 'Tempo registrado'}
              </p>
              <p className="text-4xl font-mono font-bold" style={{ color: 'var(--text)' }}>{formatTime(elapsed)}</p>
              {mode === 'pomodoro' && pomCompleted > 0 && (
                <p className="text-xs text-violet-400 mt-1.5">
                  {pomCompleted} pomodoro{pomCompleted !== 1 ? 's' : ''} concluído{pomCompleted !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm mb-1 block" style={{ color: 'var(--text-fad)' }}>Disciplina <span className="text-red-400">*</span></label>
            <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-colors"
              style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}
              autoFocus={state !== 'manual'}>
              <option value="">Selecione a disciplina estudada...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSubject && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: selectedSubject.color }} />
                <span className="text-xs" style={{ color: 'var(--text-fad)' }}>{selectedSubject.name}</span>
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
