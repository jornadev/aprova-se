import { useEffect } from 'react'

function useForceDark() {
  useEffect(() => {
    const wasLight = document.documentElement.classList.contains('light')
    document.documentElement.classList.remove('light')
    return () => { if (wasLight) document.documentElement.classList.add('light') }
  }, [])
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-violet-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    label: 'Edital verticalizado',
    desc: 'Todos os tópicos organizados por disciplina com controle de progresso',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-violet-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    label: 'Revisão espaçada',
    desc: 'Algoritmo que agenda revisões no momento certo para fixar o conteúdo',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-violet-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    label: 'Simulados com análise',
    desc: 'Acompanhe sua evolução por disciplina em cada simulado',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-violet-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    label: 'Sala de estudos',
    desc: 'Estude em grupo em tempo real com outros concurseiros',
  },
]

export default function AuthLayout({ children }) {
  useForceDark()
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-app)' }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-14">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0b20] via-[#0f0e2a] to-[#0a1020]" />
        {/* Glow orbs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-violet-700/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-700/15 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <span className="text-2xl font-bold text-violet-400 tracking-tight">aprova.se</span>
        </div>

        {/* Hero text + features */}
        <div className="relative z-10 space-y-10">
          <div>
            <h2 className="text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight">
              Candidato hoje.<br />
              <span className="text-violet-400">Aprovado em breve.</span>
            </h2>
            <p className="text-slate-400 mt-4 text-base leading-relaxed max-w-sm">
              A plataforma que transforma horas de estudo em resultados reais.
            </p>
          </div>

          <div className="space-y-5">
            {features.map(f => (
              <div key={f.label} className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">{f.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-slate-700 text-xs">
          &copy; 2026 aprova.se — todos os direitos reservados
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-[48%] flex items-center justify-center p-6 lg:p-16" style={{ background: 'var(--bg-page)' }}>
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-2xl font-bold text-violet-400">aprova.se</span>
            <p className="text-slate-500 text-sm mt-1">Plataforma de estudos para concursos</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
