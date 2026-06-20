import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

const TOUR_KEY = 'aprova-onboarding-v1'

// ── Steps ─────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    target: null,
    type: 'welcome',
  },
  {
    id: 'sidebar',
    target: 'aside',
    position: 'right',
    padding: 10,
    title: 'Sua central de navegação',
    description: 'O menu lateral dá acesso a tudo: Dashboard, Edital verticalizado, Ciclo de estudos, Planejamento semanal, Histórico, Estatísticas e Sala ao vivo.',
  },
  {
    id: 'timer',
    target: '[data-tour="floating-timer"]',
    position: 'left',
    padding: 12,
    title: 'Registre cada sessão de estudo',
    description: 'O cronômetro flutuante está sempre disponível. Clique para escolher a disciplina, ativar o cronômetro livre ou o Pomodoro — e tudo fica salvo automaticamente.',
  },
  {
    id: 'topics',
    target: 'a[href="/topics"]',
    position: 'right',
    padding: 6,
    title: 'Edital verticalizado',
    description: 'Importe o edital do seu concurso e acompanhe cada tópico. Marque o que estudou, o que dominou, e veja seu % de progresso em tempo real.',
  },
  {
    id: 'weekly-plan',
    target: 'a[href="/weekly-plan"]',
    position: 'right',
    padding: 6,
    title: 'Planejamento semanal',
    description: 'Monte sua grade de estudos: distribua as disciplinas pelos dias da semana e defina metas de horas. Acompanhe o cumprimento ao vivo.',
  },
  {
    id: 'stats',
    target: 'a[href="/stats"]',
    position: 'right',
    padding: 6,
    title: 'Estatísticas detalhadas',
    description: 'Heatmap dos últimos 12 meses, aproveitamento por disciplina, tendência de acertos e sequência de dias. Visibilidade total do seu desempenho.',
  },
  {
    id: 'done',
    target: null,
    type: 'done',
  },
]

const SPOTLIGHT_STEPS = STEPS.filter(s => !s.type)
const TOTAL_SPOTLIGHT = SPOTLIGHT_STEPS.length

// ── Spotlight hook ────────────────────────────────────────────────
function useSpotlightRect(step) {
  const [rect, setRect] = useState(null)
  const roRef = useRef(null)

  useEffect(() => {
    if (!step?.target) { setRect(null); return }

    const measure = () => {
      const el = document.querySelector(step.target)
      if (!el) return
      const r = el.getBoundingClientRect()
      const pad = step.padding ?? 8
      setRect({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
        rounded: step.rounded ?? 12,
      })
    }

    setRect(null)
    const t = setTimeout(measure, 80)

    roRef.current = new ResizeObserver(measure)
    const el = document.querySelector(step.target)
    if (el) roRef.current.observe(el)
    window.addEventListener('resize', measure)

    return () => {
      clearTimeout(t)
      roRef.current?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [step])

  return rect
}

// ── Tooltip position ──────────────────────────────────────────────
function getTooltipStyle(spotRect, position, width = 312) {
  if (!spotRect) return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width }
  const GAP = 20
  const MARGIN = 16
  let top = Math.max(MARGIN, Math.min(spotRect.top, window.innerHeight - 320))
  switch (position) {
    case 'right':
      return { position: 'fixed', top, left: spotRect.left + spotRect.width + GAP, width }
    case 'left':
      return { position: 'fixed', top, left: Math.max(MARGIN, spotRect.left - width - GAP), width }
    case 'bottom':
      return { position: 'fixed', top: spotRect.top + spotRect.height + GAP, left: Math.max(MARGIN, spotRect.left), width }
    default:
      return { position: 'fixed', top, left: spotRect.left + spotRect.width + GAP, width }
  }
}

// ── Progress dots ─────────────────────────────────────────────────
function Dots({ total, current }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 16 : 6,
            height: 6,
            background: i === current ? '#7c3aed' : 'rgba(124,58,237,0.25)',
          }}
        />
      ))}
    </div>
  )
}

// ── Arrow pointing to spotlight ───────────────────────────────────
function TooltipArrow({ position }) {
  if (!position) return null
  const base = { position: 'absolute', width: 0, height: 0 }
  const styles = {
    left: { ...base, top: 32, left: -8, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid var(--bg-card)' },
    right: { ...base, top: 32, right: -8, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid var(--bg-card)' },
  }
  return <div style={styles[position] ?? null} />
}

// ── Welcome step ─────────────────────────────────────────────────
function WelcomeStep({ onNext, onSkip }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ zIndex: 10000 }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-md)' }}
      >
        {/* Header gradient */}
        <div
          className="relative overflow-hidden px-8 pt-10 pb-8 text-center"
          style={{ background: 'linear-gradient(135deg, #0f0a2e 0%, #1a0b3d 50%, #0d1232 100%)' }}
        >
          {/* Glow orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(124,58,237,0.25)' }} />
          <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full blur-2xl pointer-events-none"
            style={{ background: 'rgba(99,102,241,0.15)' }} />

          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

          {/* Logo */}
          <div className="relative mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)' }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#a78bfa" strokeWidth={1.5} strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="#a78bfa" strokeWidth={1.5} strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="#818cf8" strokeWidth={1.5} strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'rgba(167,139,250,0.6)' }}>
              aprova.se
            </p>
          </div>

          <h1 className="text-2xl font-black text-white mb-3 relative">
            Bem-vindo ao aprova.se
          </h1>
          <p className="text-sm relative" style={{ color: 'rgba(203,213,225,0.8)', lineHeight: 1.65 }}>
            Sua jornada rumo à aprovação começa aqui. Vou te mostrar as ferramentas principais em menos de 2 minutos.
          </p>
        </div>

        {/* Feature list */}
        <div className="px-8 py-6 space-y-3">
          {[
            { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>, label: 'Edital verticalizado com rastreamento de tópicos' },
            { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9.5 3h5"/><path d="M12 3v2"/></svg>, label: 'Cronômetro livre e Pomodoro integrados' },
            { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="4" width="4" height="17" rx="1"/></svg>, label: 'Estatísticas e heatmap de progresso' },
            { svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label: 'Sala de estudos ao vivo com outros concurseiros' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                {f.svg}
              </div>
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          <button
            onClick={onNext}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
          >
            Iniciar tour rápido →
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2.5 rounded-xl text-sm transition-colors"
            style={{ color: 'var(--text-mut)', border: '1px solid var(--bdr)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-3)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mut)'}
          >
            Pular, já sei usar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Done step ────────────────────────────────────────────────────
function DoneStep({ onFinish }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-6" style={{ zIndex: 10000 }}>
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-md)' }}
      >
        <div
          className="relative overflow-hidden px-8 pt-10 pb-8"
          style={{ background: 'linear-gradient(135deg, #0f0a2e 0%, #1a0b3d 50%, #0d1232 100%)' }}
        >
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(124,58,237,0.2)' }} />

          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full mb-5"
            style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.35)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
              <path d="M20 6L9 17l-5-5" stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2 relative">Você está pronto!</h2>
          <p className="text-sm relative" style={{ color: 'rgba(203,213,225,0.8)', lineHeight: 1.65 }}>
            Agora você conhece o aprova.se. Comece importando seu edital e iniciando sua primeira sessão de estudo.
          </p>
        </div>

        <div className="px-8 py-6 space-y-3">
          <div className="rounded-xl p-4 text-left" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
            <p className="text-xs font-semibold text-violet-400 mb-1">Dica para começar</p>
            <p className="text-xs" style={{ color: 'var(--text-mut)', lineHeight: 1.6 }}>
              Acesse <strong style={{ color: 'var(--text-2)' }}>Edital</strong> no menu lateral para importar seu concurso e acompanhar os tópicos.
            </p>
          </div>

          <button
            onClick={onFinish}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
          >
            Começar a estudar →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Spotlight step tooltip ────────────────────────────────────────
function SpotlightTooltip({ step, spotRect, stepIndex, totalSpotlight, onNext, onPrev, onSkip }) {
  const spotlightIndex = SPOTLIGHT_STEPS.findIndex(s => s.id === step.id)
  const tooltipStyle = getTooltipStyle(spotRect, step.position)
  const arrowDir = step.position === 'right' ? 'left' : step.position === 'left' ? 'right' : null

  return (
    <div
      style={{ ...tooltipStyle, zIndex: 10001, transition: 'top 0.35s cubic-bezier(0.4,0,0.2,1), left 0.35s cubic-bezier(0.4,0,0.2,1)' }}
    >
      <div
        className="relative rounded-2xl shadow-2xl overflow-visible"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-md)', boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.15)' }}
      >
        <TooltipArrow position={arrowDir} />

        {/* Top accent */}
        <div className="h-1 w-full rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #7c3aed, #818cf8)' }} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <Dots total={totalSpotlight} current={spotlightIndex} />
            <button
              onClick={onSkip}
              className="text-xs transition-colors px-2 py-1 rounded-lg"
              style={{ color: 'var(--text-mut)', border: '1px solid var(--bdr)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-3)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mut)'}
            >
              Pular
            </button>
          </div>

          {/* Content */}
          <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>{step.title}</h3>
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-mut)' }}>{step.description}</p>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {spotlightIndex > 0 && (
              <button
                onClick={onPrev}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ border: '1px solid var(--bdr-md)', color: 'var(--text-3)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--row-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                ← Anterior
              </button>
            )}
            <button
              onClick={onNext}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 2px 12px rgba(124,58,237,0.3)' }}
            >
              {spotlightIndex === totalSpotlight - 1 ? 'Concluir →' : 'Próximo →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function OnboardingTour() {
  const [show] = useState(() => !localStorage.getItem(TOUR_KEY))
  const [stepIndex, setStepIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  const step = STEPS[stepIndex]
  const spotRect = useSpotlightRect(step)

  // Fade-in on mount
  useEffect(() => {
    if (show) {
      const t = setTimeout(() => setMounted(true), 50)
      return () => clearTimeout(t)
    }
  }, [show])

  const complete = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'done')
    // Force re-render by navigating — but we can't call hooks conditionally
    // Instead, use a state trick: just hide by reloading component state
    window.dispatchEvent(new CustomEvent('onboarding-done'))
  }, [])

  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const handler = () => setHidden(true)
    window.addEventListener('onboarding-done', handler)
    return () => window.removeEventListener('onboarding-done', handler)
  }, [])

  if (!show || hidden) return null

  const isWelcome = step.type === 'welcome'
  const isDone = step.type === 'done'
  const isSpotlight = !isWelcome && !isDone

  const spotlightStepCount = SPOTLIGHT_STEPS.length

  const next = () => setStepIndex(i => Math.min(i + 1, STEPS.length - 1))
  const prev = () => setStepIndex(i => Math.max(i - 1, 0))

  return createPortal(
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'all',
      }}
    >
      {/* Dark overlay */}
      {isSpotlight ? (
        <>
          {/* Clickable overlay behind spotlight (catches clicks outside) */}
          <div className="fixed inset-0" style={{ zIndex: 9998 }} />
          {/* Spotlight: box-shadow creates the dark surround, the element itself stays bright */}
          {spotRect && (
            <div
              style={{
                position: 'fixed',
                zIndex: 9999,
                top: spotRect.top,
                left: spotRect.left,
                width: spotRect.width,
                height: spotRect.height,
                borderRadius: spotRect.rounded ?? 12,
                boxShadow: '0 0 0 9999px rgba(2,6,23,0.82)',
                outline: '2px solid rgba(124,58,237,0.65)',
                outlineOffset: 3,
                transition: 'top 0.35s cubic-bezier(0.4,0,0.2,1), left 0.35s cubic-bezier(0.4,0,0.2,1), width 0.35s, height 0.35s',
                pointerEvents: 'none',
              }}
            />
          )}
          <SpotlightTooltip
            step={step}
            spotRect={spotRect}
            stepIndex={stepIndex}
            totalSpotlight={spotlightStepCount}
            onNext={next}
            onPrev={prev}
            onSkip={complete}
          />
        </>
      ) : (
        /* Modal overlay (welcome + done) */
        <div
          className="fixed inset-0"
          style={{ zIndex: 9998, background: 'rgba(2,6,23,0.88)', backdropFilter: 'blur(4px)' }}
        />
      )}

      {isWelcome && <WelcomeStep onNext={next} onSkip={complete} />}
      {isDone && <DoneStep onFinish={complete} />}
    </div>,
    document.body
  )
}
