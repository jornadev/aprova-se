import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ─── Keyframes ──────────────────────────────────────────────────────────── */
const GLOBAL_STYLES = `
@keyframes float {
  0%,100% { transform: perspective(1100px) rotateY(-7deg) rotateX(2deg) translateY(0px); }
  50%      { transform: perspective(1100px) rotateY(-7deg) rotateX(2deg) translateY(-14px); }
}
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes glow-pulse {
  0%,100% { box-shadow: 0 4px 32px rgba(124,58,237,0.42); }
  50%     { box-shadow: 0 4px 64px rgba(124,58,237,0.72), 0 0 120px rgba(124,58,237,0.2); }
}
@keyframes dot-blink {
  0%,100% { opacity:1; } 50% { opacity:0.3; }
}
@keyframes fade-tab {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes count-up {
  from { opacity:0; transform:scale(0.85); }
  to   { opacity:1; transform:scale(1); }
}
`

/* ─── Force dark on public pages ─────────────────────────────────────────── */
function useForceDark() {
  useEffect(() => {
    const was = document.documentElement.classList.contains('light')
    document.documentElement.classList.remove('light')
    return () => { if (was) document.documentElement.classList.add('light') }
  }, [])
}

/* ─── Scroll reveal ──────────────────────────────────────────────────────── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, v]
}

function Reveal({ children, delay = 0, y = 30, className = '' }) {
  const [ref, v] = useReveal()
  return (
    <div ref={ref} className={className} style={{
      opacity: v ? 1 : 0,
      transform: v ? 'none' : `translateY(${y}px)`,
      transition: `opacity .7s cubic-bezier(.4,0,.2,1) ${delay}ms, transform .7s cubic-bezier(.4,0,.2,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const ArrowRight = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
  </svg>
)
const Check = ({ color = '#22c55e' }) => (
  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 flex-shrink-0">
    <path d="M2 6l3 3 5-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Feature tab icons
const IcoClipboard = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
)
const IcoTimer = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8"/>
    <path d="M12 9v4l2.5 2.5"/>
    <path d="M9.5 3h5"/>
    <path d="M12 3v2"/>
  </svg>
)
const IcoBarChart = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="9" rx="1"/>
    <rect x="10" y="7" width="4" height="14" rx="1"/>
    <rect x="17" y="4" width="4" height="17" rx="1"/>
  </svg>
)
const IcoCalendar = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
  </svg>
)

// Pain card icons
const IcoSearch = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/>
    <path d="M21 21l-4.35-4.35"/>
    <path d="M11 8v6M8 11h6"/>
  </svg>
)
const IcoBrain = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V14h-4v-1.5A4 4 0 0 1 8 9a4 4 0 0 1 4-4z"/>
    <path d="M9.5 9a2.5 2.5 0 0 1 5 0"/>
    <rect x="9" y="14" width="6" height="3" rx="1"/>
    <path d="M10 17v2M14 17v2"/>
  </svg>
)
const IcoTrendUp = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
)

// How-it-works icons
const IcoUserPlus = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/>
    <line x1="17" y1="11" x2="23" y2="11"/>
  </svg>
)
const IcoUpload = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const IcoTarget = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
)

// Misc
const IcoFlame = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c0 1.1-.9 2-2 2a3 3 0 0 1-3-3c0-2 1.5-3.5 3-5 .5 1 .5 2 .5 3z"/>
    <path d="M12 2c0 4-2.5 6-2.5 9.5a3.5 3.5 0 0 0 7 0C16.5 7 14 5 14 2c-1 1-2 2-2 4a2 2 0 0 1-4 0c0-2 1-3 2-4z"/>
  </svg>
)
const IcoPause = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1"/>
    <rect x="14" y="4" width="4" height="16" rx="1"/>
  </svg>
)
const IcoStop = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="5" width="14" height="14" rx="2"/>
  </svg>
)

/* ─── Floating hero mockup ───────────────────────────────────────────────── */
function HeroMockup() {
  return (
    <div className="relative w-full max-w-[540px] mx-auto">
      {/* Glow layers */}
      <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(124,58,237,0.12)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'rgba(99,102,241,0.08)' }} />

      {/* Browser window */}
      <div style={{
        animation: 'float 5s ease-in-out infinite',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 48px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(124,58,237,0.1)',
      }}>
        {/* Browser bar */}
        <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: '#06090f', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(239,68,68,0.5)' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(234,179,8,0.5)' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(34,197,94,0.5)' }} />
          </div>
          <div className="flex-1 rounded-md h-5 flex items-center justify-center" style={{ background: '#0d1629' }}>
            <span className="text-[10px]" style={{ color: '#334155' }}>aprova.se/dashboard</span>
          </div>
        </div>

        {/* App layout */}
        <div className="flex" style={{ height: 300, background: '#0b1222' }}>
          {/* Sidebar */}
          <div className="flex flex-col px-2.5 py-3 gap-0.5" style={{ width: 112, background: '#06090f', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="mb-3 px-1.5" style={{ fontSize: 9, fontWeight: 900, color: '#7c3aed' }}>aprova.se</div>
            {[['Dashboard', true],['Edital', false],['Planejamento', false],['Estatísticas', false],['Sala ao vivo', false]].map(([l, a]) => (
              <div key={l} className="text-[8px] px-1.5 py-1.5 rounded-md truncate"
                style={a ? { background: 'rgba(124,58,237,0.18)', color: '#a78bfa', boxShadow: 'inset 2px 0 0 #7c3aed' } : { color: '#334155' }}>
                {l}
              </div>
            ))}
            <div className="mt-auto pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-1 px-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span style={{ fontSize: 6, color: 'rgba(74,222,128,0.7)' }}>3 online</span>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-3 space-y-2 overflow-hidden">
            <div className="grid grid-cols-4 gap-1.5">
              {[['Hoje','2h 30min','#a78bfa'],['Semana','18h','#34d399'],['Mês','72h','#818cf8'],['Sequência','12 dias','#f97316']].map(([l,v,c]) => (
                <div key={l} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 7, color: c, opacity: .7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>{l}</div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: c }}>{v}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', height: 90 }}>
              <div style={{ fontSize: 7, color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em', marginBottom: 6 }}>Últimos 7 dias</div>
              <div className="flex items-end gap-1" style={{ height: 40 }}>
                {[.35,.6,.45,.88,.55,.78,1].map((h,i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h*100}%`, background: i===6 ? '#a78bfa' : 'rgba(124,58,237,0.35)' }} />
                ))}
              </div>
              <div className="flex gap-1 mt-1.5">
                {['S','T','Q','Q','S','S','D'].map((d,i) => (
                  <div key={i} className="flex-1 text-center" style={{ fontSize: 6, color: '#1e293b' }}>{d}</div>
                ))}
              </div>
            </div>

            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="px-2 py-1" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 7, color: 'rgba(148,163,184,0.4)', fontWeight: 700 }}>PAINEL DE HOJE</span>
              </div>
              {[['Língua Portuguesa','1h 20min','#6366f1',82],['Raciocínio Lógico','45min','#22c55e',68],['Informática','25min','#f59e0b',75]].map(([n,t,c,p],i) => (
                <div key={n} className="flex items-center gap-1.5 px-2 py-1" style={{ borderBottom: i<2 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <div className="w-0.5 h-4 rounded-full flex-shrink-0" style={{ background: c }} />
                  <span className="flex-1 truncate" style={{ fontSize: 7, color: '#475569' }}>{n}</span>
                  <span style={{ fontSize: 7, color: '#334155' }}>{t}</span>
                  <span style={{ fontSize: 7, fontWeight: 700, color: p>=70 ? '#22c55e' : '#eab308' }}>{p}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Pomodoro card */}
      <div className="absolute -right-6 top-12 rounded-xl px-3 py-2.5 shadow-2xl" style={{
        background: '#111827', border: '1px solid rgba(124,58,237,0.35)',
        width: 128, boxShadow: '0 20px 48px rgba(0,0,0,0.6), 0 0 24px rgba(124,58,237,0.12)',
        animation: 'float 5s ease-in-out infinite', animationDelay: '0.5s',
      }}>
        <div className="flex items-center gap-1 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa', animation: 'dot-blink 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 8, color: '#a78bfa', fontWeight: 600 }}>Pomodoro</span>
        </div>
        <div className="text-center font-mono font-black text-white leading-none" style={{ fontSize: 22 }}>24:13</div>
        <div className="text-center mt-0.5" style={{ fontSize: 7, color: '#334155' }}>Foco · ciclo 2/4</div>
        <div className="flex gap-0.5 justify-center mt-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-1 rounded-full" style={{ width: 14, background: i<=2 ? '#7c3aed' : 'rgba(124,58,237,0.15)' }} />
          ))}
        </div>
      </div>

      {/* Floating progress card */}
      <div className="absolute -left-8 bottom-8 rounded-xl p-3 shadow-2xl" style={{
        background: '#111827', border: '1px solid rgba(99,102,241,0.2)',
        width: 150, boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
        animation: 'float 5s ease-in-out infinite', animationDelay: '1s',
      }}>
        <div className="mb-2.5" style={{ fontSize: 8, color: '#334155', fontWeight: 600 }}>Progresso hoje</div>
        <div className="space-y-1.5">
          {[['Sequência','12 dias','#f97316'],['Horas hoje','2h 30min','#a78bfa'],['Aproveitamento','76%','#22c55e']].map(([l,v,c]) => (
            <div key={l} className="flex items-center justify-between">
              <span style={{ fontSize: 8, color: '#1e3a5f' }}>{l}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Marquee strip ──────────────────────────────────────────────────────── */
const CONCURSOS = [
  'Polícia Civil', 'Polícia Penal', 'INSS', 'Receita Federal', 'TRT', 'TRF', 'Correios', 'Banco Central',
  'PF — Agente Federal', 'TJSP', 'MPSC', 'SEFAZ', 'Prefeituras', 'Concurso Unificado CPNU', 'CGU', 'TCU',
]

function Marquee() {
  const items = [...CONCURSOS, ...CONCURSOS]
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', overflow: 'hidden', padding: '14px 0' }}>
      <div style={{ display: 'flex', gap: 0, animation: 'marquee 35s linear infinite', width: 'max-content' }}>
        {items.map((c, i) => (
          <div key={i} className="flex items-center gap-3" style={{ paddingRight: 48 }}>
            <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap' }}>{c}</span>
            <span style={{ color: 'rgba(124,58,237,0.3)', fontSize: 12 }}>·</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Feature showcase ───────────────────────────────────────────────────── */

function EditalMockup() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#080f1e', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'system-ui', fontSize: 11 }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#060b16' }}>
        <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 10 }}>EDITAL VERTICALIZADO</span>
        <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 10 }}>72%</span>
      </div>
      <div className="px-4 pb-1 pt-2">
        <div className="rounded-full h-1.5 w-full mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-1.5 rounded-full" style={{ width: '72%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }} />
        </div>
      </div>
      {[
        { name: 'Língua Portuguesa', color: '#6366f1', topics: [['Leitura e interpretação', true],['Ortografia', true],['Morfologia', false]] },
        { name: 'Raciocínio Lógico', color: '#22c55e', topics: [['Proposições e Conectivos', true],['Tabelas-verdade', false]] },
        { name: 'Informática', color: '#f59e0b', topics: [['Windows 10', false],['Office 365', false]] },
      ].map((s, si) => (
        <div key={s.name} className="mb-1">
          <div className="flex items-center gap-2 px-4 py-2 cursor-pointer" style={{ background: si===0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
            <div className="w-1 h-4 rounded-full" style={{ background: s.color }} />
            <span style={{ color: '#94a3b8', fontWeight: 600, flex: 1 }}>{s.name}</span>
            <span style={{ color: '#334155', fontSize: 10 }}>{s.topics.filter(t=>t[1]).length}/{s.topics.length}</span>
            <span style={{ color: '#334155', fontSize: 10 }}>{si===0?'▲':'▼'}</span>
          </div>
          {si === 0 && s.topics.map(([t, done]) => (
            <div key={t} className="flex items-center gap-2 pl-10 pr-4 py-1.5">
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: done ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
                {done && <Check />}
              </div>
              <span style={{ color: done ? '#475569' : '#64748b', textDecoration: done ? 'line-through' : 'none' }}>{t}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function TimerMockup() {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#080f1e', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#060b16', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
        CRONÔMETRO E POMODORO
      </div>
      <div className="p-5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ animation: 'dot-blink 1s ease-in-out infinite' }} />
          <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 600 }}>Sessão ativa</span>
        </div>

        <div className="font-mono font-black text-white mb-1" style={{ fontSize: 52, lineHeight: 1, letterSpacing: '-2px' }}>24:13</div>
        <div className="mb-5" style={{ fontSize: 11, color: '#334155' }}>ciclo 2 de 4 · pausa em breve</div>

        <div className="flex gap-1.5 justify-center mb-5">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-full" style={{ width: 32, height: 6, background: i<=2 ? 'linear-gradient(90deg,#7c3aed,#a78bfa)' : 'rgba(124,58,237,0.12)', boxShadow: i<=2 ? '0 0 8px rgba(124,58,237,0.4)' : 'none' }} />
          ))}
        </div>

        <div className="rounded-xl p-3 mb-4 text-left" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, color: '#334155', marginBottom: 2 }}>Disciplina ativa</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#6366f1' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Língua Portuguesa</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 rounded-xl py-2 flex items-center justify-center gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#475569' }}><IcoPause /> Pausar</button>
          <button className="flex-1 rounded-xl py-2 flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', fontSize: 11, color: 'white', fontWeight: 600 }}><IcoStop /> Encerrar</button>
        </div>
      </div>
    </div>
  )
}

function StatsMockup() {
  const days = Array.from({ length: 35 }, (_, i) => {
    const v = [0,0,1,2,3,2,1,0,1,3,4,4,2,1,0,2,3,4,4,3,1,0,1,2,3,2,4,4,3,2,1,0,2,3,4][i] || 0
    return v
  })
  const colors = ['rgba(124,58,237,0.06)', 'rgba(124,58,237,0.2)', 'rgba(124,58,237,0.4)', 'rgba(124,58,237,0.65)', '#7c3aed']
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#080f1e', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#060b16', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
        ESTATÍSTICAS
      </div>
      <div className="p-4 space-y-4">
        {/* Heatmap */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 10, color: '#334155', fontWeight: 600 }}>FREQUÊNCIA · ÚLTIMAS 5 SEMANAS</span>
            <span style={{ fontSize: 10, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 3 }}><IcoFlame /> 12 dias</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {days.map((v, i) => (
              <div key={i} className="rounded" style={{ height: 14, background: colors[v] }} />
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div>
          <div className="mb-2" style={{ fontSize: 10, color: '#334155', fontWeight: 600 }}>HORAS POR DISCIPLINA</div>
          {[['Língua Portuguesa', '#6366f1', 78],['Raciocínio Lógico', '#22c55e', 55],['Informática', '#f59e0b', 35],['Legislação', '#ef4444', 62]].map(([n,c,p]) => (
            <div key={n} className="flex items-center gap-2 mb-2">
              <span className="truncate" style={{ fontSize: 10, color: '#475569', width: 110 }}>{n}</span>
              <div className="flex-1 rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${p}%`, background: c }} />
              </div>
              <span style={{ fontSize: 10, color: '#334155', width: 28, textAlign: 'right' }}>{Math.round(p*.5)}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PlanMockup() {
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const SUBJS = [
    { name: 'L. Portuguesa', color: '#6366f1', hours: [2,2,0,1,2,1] },
    { name: 'R. Lógico', color: '#22c55e', hours: [1,0,2,1,0,2] },
    { name: 'Informática', color: '#f59e0b', hours: [0,1,1,0,1,0] },
    { name: 'Legislação', color: '#ef4444', hours: [1,1,0,2,1,0] },
  ]
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#080f1e', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#060b16' }}>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>PLANEJAMENTO SEMANAL</span>
        <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>9h / 14h ✓</span>
      </div>
      <div className="p-3">
        <div className="grid mb-2" style={{ gridTemplateColumns: '90px repeat(6, 1fr)', gap: 4 }}>
          <div />
          {DAYS.map(d => <div key={d} className="text-center" style={{ fontSize: 9, color: '#334155', fontWeight: 700 }}>{d}</div>)}
        </div>
        {SUBJS.map(s => (
          <div key={s.name} className="grid mb-1.5 items-center" style={{ gridTemplateColumns: '90px repeat(6, 1fr)', gap: 4 }}>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="truncate" style={{ fontSize: 9, color: '#475569' }}>{s.name}</span>
            </div>
            {s.hours.map((h, i) => (
              <div key={i} className="rounded text-center py-1" style={{
                fontSize: 9, fontWeight: 600,
                background: h > 0 ? `${s.color}22` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${h > 0 ? s.color + '33' : 'rgba(255,255,255,0.04)'}`,
                color: h > 0 ? s.color : '#1e293b',
              }}>
                {h > 0 ? `${h}h` : '—'}
              </div>
            ))}
          </div>
        ))}
        <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: 9, color: '#334155' }}>Meta semanal: 14h</span>
          <div className="flex gap-1">
            {[1,1,1,1,1,0,0].map((done, i) => (
              <div key={i} className="w-4 h-4 rounded flex items-center justify-center"
                style={{ background: done ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${done ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.05)'}` }}>
                {done ? <Check /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const FEATURE_TABS = [
  {
    id: 'edital',
    Icon: IcoClipboard,
    title: 'Edital verticalizado',
    desc: 'Importe seu concurso e acompanhe cada tópico individualmente. Saiba exatamente o que falta estudar e veja seu % real de progresso — sem planilha.',
    badge: 'Principal',
    mockup: EditalMockup,
  },
  {
    id: 'timer',
    Icon: IcoTimer,
    title: 'Cronômetro e Pomodoro',
    desc: 'Registre cada minuto de foco com cronômetro livre ou ciclos Pomodoro. Tudo salvo automaticamente, por disciplina, com histórico completo.',
    mockup: TimerMockup,
  },
  {
    id: 'stats',
    Icon: IcoBarChart,
    title: 'Estatísticas detalhadas',
    desc: 'Heatmap dos últimos meses, horas por disciplina, sequência de dias consecutivos e tendência de acertos. Visibilidade total do seu progresso real.',
    mockup: StatsMockup,
  },
  {
    id: 'plan',
    Icon: IcoCalendar,
    title: 'Planejamento semanal',
    desc: 'Distribua as disciplinas pelos dias da semana, defina metas de horas e acompanhe o cumprimento ao vivo conforme vai estudando.',
    mockup: PlanMockup,
  },
]

function FeatureShowcase() {
  const [active, setActive] = useState('edital')
  const current = FEATURE_TABS.find(f => f.id === active)
  const Mock = current.mockup
  const [ref, v] = useReveal()

  return (
    <div ref={ref} style={{
      opacity: v ? 1 : 0, transition: 'opacity .8s ease',
    }}>
      <div className="grid lg:grid-cols-5 gap-8 items-start">
        {/* Tab list */}
        <div className="lg:col-span-2 space-y-2">
          {FEATURE_TABS.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{
                background: active === f.id ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active === f.id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)'}`,
                transform: v ? 'none' : 'translateX(-20px)',
                opacity: v ? 1 : 0,
                transition: `all .6s cubic-bezier(.4,0,.2,1) ${i * 80}ms`,
              }}
            >
              <div className="flex items-start gap-3">
                <span style={{ lineHeight: 1, marginTop: 2, color: active === f.id ? '#a78bfa' : '#475569' }}><f.Icon size={18} /></span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: active === f.id ? '#c4b5fd' : '#64748b' }}>
                      {f.title}
                    </span>
                    {f.badge && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}>
                        {f.badge}
                      </span>
                    )}
                  </div>
                  {active === f.id && (
                    <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, animation: 'fade-tab .3s ease' }}>
                      {f.desc}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Mockup */}
        <div className="lg:col-span-3" key={active} style={{ animation: 'fade-tab .35s ease' }}>
          <Mock />
        </div>
      </div>
    </div>
  )
}

/* ─── Animated stat ──────────────────────────────────────────────────────── */
function StatNumber({ value, label, suffix = '' }) {
  const [ref, v] = useReveal()
  return (
    <div ref={ref} className="text-center" style={{ opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(20px)', transition: 'all .7s ease' }}>
      <div className="font-black" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: '#a78bfa', lineHeight: 1, animation: v ? 'count-up .5s ease' : 'none' }}>
        {value}{suffix}
      </div>
      <div className="mt-2" style={{ fontSize: '0.875rem', color: '#334155' }}>{label}</div>
    </div>
  )
}

/* ─── How it works step ──────────────────────────────────────────────────── */
function HowStep({ n, Icon, title, desc, delay }) {
  const [ref, v] = useReveal()
  return (
    <div ref={ref} className="text-center" style={{
      opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(28px)',
      transition: `all .7s cubic-bezier(.4,0,.2,1) ${delay}ms`,
    }}>
      <div className="relative inline-flex items-center justify-center mb-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa' }}>
          <Icon size={28} />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: '#7c3aed', color: 'white', boxShadow: '0 0 12px rgba(124,58,237,0.5)' }}>
          {n}
        </div>
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.7 }}>{desc}</p>
    </div>
  )
}

/* ─── Pain card ──────────────────────────────────────────────────────────── */
function PainCard({ Icon, problem, solution, delay }) {
  const [ref, v] = useReveal()
  return (
    <div ref={ref} className="rounded-2xl p-6" style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
      opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(28px)',
      transition: `all .7s cubic-bezier(.4,0,.2,1) ${delay}ms`,
    }}>
      <div className="mb-4 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)', color: '#a78bfa' }}><Icon size={24} /></div>
      <p className="font-semibold mb-3 italic" style={{ color: '#94a3b8', fontSize: '0.95rem' }}>"{problem}"</p>
      <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.7 }}>{solution}</p>
    </div>
  )
}

/* ─── Pricing card ───────────────────────────────────────────────────────── */
function PricingCard() {
  const ITEMS = [
    'Acesso completo a todas as funcionalidades',
    'Editais ilimitados',
    'Simulados ilimitados',
    'Sala de estudos ao vivo',
    'Revisão espaçada automática',
    'Suporte por e-mail',
  ]
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.04)', position: 'relative' }}>
      {/* Badge */}
      <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: '0 0 10px 10px', padding: '4px 20px' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'white', letterSpacing: '.06em', textTransform: 'uppercase' }}>Acesso gratuito</span>
      </div>

      <div className="p-8 pt-10">
        {/* Free badge */}
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-5" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', animation: 'dot-blink 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 600 }}>Crie sua conta e comece agora</span>
        </div>

        {/* Price */}
        <div className="flex items-end gap-2 mb-1">
          <div>
            <div className="flex items-baseline gap-1">
              <span style={{ fontSize: '3.2rem', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-2px' }}>Grátis</span>
            </div>
          </div>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#334155', marginBottom: 24 }}>Acesso completo a todas as funcionalidades.</p>

        {/* Features */}
        <div className="space-y-2.5 mb-7">
          {ITEMS.map(item => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <Check color="#a78bfa" />
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{item}</span>
            </div>
          ))}
        </div>

        <Link to="/register"
          className="flex items-center justify-center gap-2 w-full font-bold py-3.5 rounded-xl text-sm text-white"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 24px rgba(124,58,237,0.25)', textDecoration: 'none' }}>
          Criar conta grátis <ArrowRight />
        </Link>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function Landing() {
  useForceDark()
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen" style={{ background: '#070b14' }} />
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div className="min-h-screen flex flex-col" style={{ background: '#070b14', color: '#e2e8f0' }}>

        {/* ── Nav ── */}
        <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(7,11,20,0.88)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="text-lg font-black tracking-tight">
              <span className="text-white">aprova</span><span style={{ color: '#7c3aed' }}>.se</span>
            </span>
            <nav className="hidden md:flex items-center gap-6">
              {[['Funcionalidades','#features'],['Como funciona','#how'],['O que inclui','#pricing']].map(([l, h]) => (
                <a key={l} href={h} style={{ fontSize: '0.875rem', color: '#475569', textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#94a3b8'}
                  onMouseLeave={e => e.currentTarget.style.color='#475569'}>
                  {l}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Link to="/login" style={{ fontSize: '0.875rem', color: '#475569', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color='#94a3b8'}
                onMouseLeave={e => e.currentTarget.style.color='#475569'}>
                Entrar
              </Link>
              <Link to="/register" className="flex items-center gap-1.5 font-semibold text-white text-sm px-4 py-2 rounded-lg"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', textDecoration: 'none' }}>
                Criar conta
              </Link>
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="relative overflow-hidden pt-20 pb-28 lg:pt-28 lg:pb-36">
          {/* Background glows */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/3 w-[700px] h-[700px] rounded-full blur-3xl" style={{ background: 'rgba(124,58,237,0.07)' }} />
            <div className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: 'rgba(99,102,241,0.05)' }} />
            <div className="absolute inset-0 opacity-[0.025]"
              style={{ backgroundImage: 'radial-gradient(circle,#a78bfa 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
          </div>

          <div className="relative max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">

              {/* Copy */}
              <div className="space-y-8">
                <Reveal delay={0}>
                  <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: 'rgba(124,58,237,0.09)', border: '1px solid rgba(124,58,237,0.22)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa', animation: 'dot-blink 1.5s ease-in-out infinite' }} />
                    <span style={{ fontSize: '0.75rem', color: '#c4b5fd', fontWeight: 600, letterSpacing: '.04em' }}>
                      Plataforma completa para concurseiros
                    </span>
                  </div>
                </Reveal>

                <Reveal delay={80}>
                  <h1 style={{ fontSize: 'clamp(2.4rem,5vw,3.8rem)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-1px', color: 'white', margin: 0 }}>
                    Estudante hoje,<br />
                    <span style={{ backgroundImage: 'linear-gradient(135deg,#a78bfa,#818cf8,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      aprovado amanhã.
                    </span>
                  </h1>
                </Reveal>

                <Reveal delay={140}>
                  <p style={{ fontSize: '1.1rem', color: '#64748b', lineHeight: 1.75, maxWidth: 480, margin: 0 }}>
                    Edital organizado, revisão espaçada automática, estatísticas claras e sala de estudos ao vivo. Tudo que você precisa para ir do caos à aprovação.
                  </p>
                </Reveal>

                <Reveal delay={200}>
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <Link to="/register"
                      className="flex items-center gap-2 font-bold px-7 py-3.5 rounded-xl text-sm text-white"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 28px rgba(124,58,237,0.25)', textDecoration: 'none' }}>
                      Criar conta grátis <ArrowRight />
                    </Link>
                    <Link to="/login"
                      className="flex items-center gap-2 py-3.5 text-sm"
                      style={{ color: '#475569', textDecoration: 'none', transition: 'color .2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                      onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                      Já tenho conta →
                    </Link>
                  </div>
                </Reveal>

                {/* Hero stats */}
                <Reveal delay={260}>
                  <div className="grid grid-cols-3 gap-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {[['6','ferramentas integradas'],['100%','foco em concursos'],['∞','sessões e tópicos']].map(([v,l]) => (
                      <div key={l}>
                        <div style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 900, color: '#a78bfa', lineHeight: 1 }}>{v}</div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 3, lineHeight: 1.4 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>

              {/* Mockup */}
              <Reveal delay={120} className="hidden lg:block">
                <HeroMockup />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Marquee ── */}
        <Marquee />

        {/* ── Pain points ── */}
        <section style={{ background: '#060a12', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 0' }}>
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="text-center mb-14">
              <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '.12em', color: '#7c3aed', textTransform: 'uppercase', marginBottom: 12 }}>O problema</p>
              <h2 style={{ fontSize: 'clamp(1.75rem,3vw,2.5rem)', fontWeight: 800, color: 'white', margin: '0 0 12px' }}>
                Você provavelmente sente isso
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#334155', maxWidth: 420, margin: '0 auto' }}>
                Estudar muito não é o mesmo que estudar certo. Esses são os três maiores bloqueios.
              </p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <PainCard delay={0}   Icon={IcoSearch}   problem="Não sei o que estudar hoje."         solution="O edital verticalizado e o planejamento semanal mostram exatamente o que está pendente — sem depender de intuição ou planilha." />
              <PainCard delay={100} Icon={IcoBrain}    problem="Estudo muito mas esqueço rápido."     solution="O algoritmo de revisão espaçada agenda automaticamente os momentos certos para revisar e fixar o conteúdo antes que você esqueça." />
              <PainCard delay={200} Icon={IcoTrendUp}  problem="Não sei se estou evoluindo de fato."  solution="Heatmap, horas por disciplina, sequência de dias e aproveitamento por simulado te dão visibilidade real — não achismos." />
            </div>
          </div>
        </section>

        {/* ── Feature showcase ── */}
        <section id="features" style={{ background: '#070b14', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 0' }}>
          <div className="max-w-6xl mx-auto px-6">
            <Reveal className="text-center mb-14">
              <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '.12em', color: '#7c3aed', textTransform: 'uppercase', marginBottom: 12 }}>Funcionalidades</p>
              <h2 style={{ fontSize: 'clamp(1.75rem,3vw,2.5rem)', fontWeight: 800, color: 'white', margin: '0 0 12px' }}>
                Tudo integrado em um só lugar
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#334155', maxWidth: 380, margin: '0 auto' }}>
                Clique em cada funcionalidade para ver como ela funciona na prática.
              </p>
            </Reveal>
            <FeatureShowcase />
          </div>
        </section>

        {/* ── Stats ── */}
        <section style={{ background: '#060a12', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '72px 0' }}>
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatNumber value="6"    suffix="+"  label="funcionalidades integradas" />
              <StatNumber value="100"  suffix="%"  label="focado em concursos públicos" />
              <StatNumber value="∞"    suffix=""   label="sessões e tópicos sem limite" />
              <StatNumber value="0"    suffix=""       label="custo para começar" />
            </div>
          </div>
        </section>

        {/* ── Study Room highlight ── */}
        <section style={{ background: '#070b14', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 0' }}>
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <Reveal>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-5" style={{ background: 'rgba(124,58,237,0.09)', border: '1px solid rgba(124,58,237,0.22)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa', animation: 'dot-blink 1.5s ease-in-out infinite' }} />
                    <span style={{ fontSize: '0.72rem', color: '#c4b5fd', fontWeight: 600, letterSpacing: '.04em' }}>Exclusivo</span>
                  </div>
                  <h2 style={{ fontSize: 'clamp(1.75rem,3vw,2.5rem)', fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.15 }}>
                    Você não precisa<br/>
                    <span style={{ backgroundImage: 'linear-gradient(135deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      estudar sozinho.
                    </span>
                  </h2>
                  <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.75, marginTop: 16 }}>
                    A Sala de Estudos ao vivo conecta você com outros concurseiros em tempo real. Escolha um assento, mostre o que está estudando e acompanhe quem está online. Ter companhia muda tudo na motivação.
                  </p>
                  <div className="space-y-3 mt-6">
                    {[
                      'Veja quem está estudando agora, em tempo real',
                      'Mostre sua disciplina e tempo de foco no seu assento',
                      'Chat ao vivo para trocar dicas e motivação',
                      'Sinta a energia de estudar junto, mesmo a distância',
                    ].map(item => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
                          <Check color="#a78bfa" />
                        </div>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={150}>
                <div className="rounded-xl overflow-hidden" style={{ background: '#080f1e', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#060b16' }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>SALA DE ESTUDOS</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', animation: 'dot-blink 1.5s ease-in-out infinite' }} />
                      <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>5 online</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2.5">
                      {[
                        { name: 'Ana', subject: 'Português', time: '1h24', color: '#6366f1' },
                        { name: 'Carlos', subject: 'RLM', time: '45min', color: '#22c55e' },
                        { name: 'Bia', subject: 'Informática', time: '2h10', color: '#f59e0b' },
                        { name: 'João', subject: 'Legislação', time: '32min', color: '#ef4444' },
                        { name: 'Você', subject: '', time: '', color: '#7c3aed', empty: true },
                        { name: 'Mari', subject: 'D. Penal', time: '1h55', color: '#ec4899' },
                        null,
                        null,
                      ].map((seat, i) => (
                        <div key={i} className="rounded-lg p-2.5 text-center" style={{
                          background: seat?.empty ? 'rgba(124,58,237,0.08)' : seat ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                          border: `1px solid ${seat?.empty ? 'rgba(124,58,237,0.3)' : seat ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}`,
                          minHeight: 70,
                        }}>
                          {seat ? (
                            seat.empty ? (
                              <div className="flex flex-col items-center justify-center h-full gap-1">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)', border: '1px dashed rgba(124,58,237,0.4)' }}>
                                  <span style={{ fontSize: 14, color: '#a78bfa' }}>+</span>
                                </div>
                                <span style={{ fontSize: 8, color: '#7c3aed', fontWeight: 600 }}>SENTAR</span>
                              </div>
                            ) : (
                              <>
                                <div className="w-6 h-6 rounded-full mx-auto flex items-center justify-center" style={{ background: `${seat.color}30`, border: `1px solid ${seat.color}50` }}>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: seat.color }}>{seat.name[0]}</span>
                                </div>
                                <div style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', marginTop: 4 }}>{seat.name}</div>
                                <div style={{ fontSize: 8, color: seat.color, marginTop: 1 }}>{seat.subject}</div>
                                <div style={{ fontSize: 8, color: '#334155', marginTop: 1 }}>{seat.time}</div>
                              </>
                            )
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span style={{ fontSize: 9, color: '#1e293b' }}>vazio</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex-1 rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: 9, color: '#334155' }}>Bora estudar galera!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" style={{ background: '#070b14', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 0' }}>
          <div className="max-w-5xl mx-auto px-6">
            <Reveal className="text-center mb-16">
              <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '.12em', color: '#7c3aed', textTransform: 'uppercase', marginBottom: 12 }}>Como funciona</p>
              <h2 style={{ fontSize: 'clamp(1.75rem,3vw,2.5rem)', fontWeight: 800, color: 'white', margin: 0 }}>
                Do zero à rotina em 3 passos
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
              {/* Connector line */}
              <div className="absolute top-8 left-1/4 right-1/4 h-px hidden md:block" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent)' }} />
              <HowStep n="1" Icon={IcoUserPlus} delay={0}   title="Crie sua conta"  desc="Em menos de 1 minuto você já tem acesso completo a todas as funcionalidades." />
              <HowStep n="2" Icon={IcoUpload}   delay={120} title="Importe seu edital"   desc="Adicione as disciplinas e tópicos do seu concurso. O sistema organiza tudo e você já começa a marcar o progresso." />
              <HowStep n="3" Icon={IcoTarget}   delay={240} title="Estude com método"    desc="Use o cronômetro, complete revisões, siga o plano semanal e acompanhe sua evolução em tempo real." />
            </div>
          </div>
        </section>

        {/* ── Checklist + Pricing ── */}
        <section id="pricing" style={{ background: '#060a12', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '80px 0' }}>
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <Reveal>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '.12em', color: '#7c3aed', textTransform: 'uppercase', marginBottom: 12 }}>Tudo incluso</p>
                <h2 style={{ fontSize: 'clamp(1.6rem,2.8vw,2.4rem)', fontWeight: 800, color: 'white', margin: '0 0 24px', lineHeight: 1.2 }}>
                  Tudo que um concurseiro sério precisa
                </h2>
                <div className="space-y-3">
                  {[
                    'Edital verticalizado com progresso por tópico',
                    'Cronômetro livre e Pomodoro configurável',
                    'Revisões espaçadas automáticas após cada sessão',
                    'Planejamento semanal com metas de horas',
                    'Histórico completo de sessões de estudo',
                    'Heatmap · aproveitamento · tendências · sequências',
                    'Sala de estudos ao vivo com outros concurseiros',
                    'Simulados com análise de aproveitamento por disciplina',
                  ].map(item => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <Check />
                      </div>
                      <span style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={150}>
                <PricingCard />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="relative overflow-hidden" style={{ background: '#070b14', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '96px 0' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl" style={{ background: 'rgba(124,58,237,0.07)' }} />
            <div className="absolute inset-0 opacity-[0.02]"
              style={{ backgroundImage: 'radial-gradient(circle,#a78bfa 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
          </div>
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <Reveal>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '.12em', color: '#7c3aed', textTransform: 'uppercase', marginBottom: 16 }}>Pronto para começar?</p>
              <h2 style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 900, color: 'white', margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-1px' }}>
                Concurseiro hoje.<br />
                <span style={{ backgroundImage: 'linear-gradient(135deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Aprovado amanhã.
                </span>
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#334155', margin: '0 0 40px', lineHeight: 1.7, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                Pare de estudar no improviso. Tenha método, visibilidade e consistência — do edital à aprovação.
              </p>
              <Link to="/register"
                className="inline-flex items-center gap-2 font-bold px-10 py-4 rounded-xl text-base text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 40px rgba(124,58,237,0.25)', textDecoration: 'none' }}>
                Criar conta grátis <ArrowRight />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ background: '#04070d', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '24px 0' }}>
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span style={{ fontWeight: 900, color: '#334155' }}>
              aprova<span style={{ color: 'rgba(124,58,237,0.5)' }}>.se</span>
            </span>
            <div className="flex items-center gap-6">
              {[['Privacidade','/privacy'],['Termos','/terms']].map(([l, href]) => (
                <Link key={l} to={href} style={{ fontSize: '0.8rem', color: '#475569', textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.color='#94a3b8'}
                  onMouseLeave={e => e.currentTarget.style.color='#475569'}>
                  {l}
                </Link>
              ))}
              <a href="mailto:suporte@aprova.se" style={{ fontSize: '0.8rem', color: '#475569', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => e.currentTarget.style.color='#94a3b8'}
                onMouseLeave={e => e.currentTarget.style.color='#475569'}>
                Contato
              </a>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#475569' }}>© 2026 aprova.se</p>
          </div>
        </footer>
      </div>
    </>
  )
}
