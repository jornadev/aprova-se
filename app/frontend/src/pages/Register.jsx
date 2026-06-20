import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import { createPortal } from 'react-dom'

function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [password.length >= 6, /[A-Z]/.test(password), /[0-9]/.test(password)]
  const score = checks.filter(Boolean).length
  const bars = [
    score >= 1 ? (score === 1 ? '#ef4444' : score === 2 ? '#f59e0b' : '#22c55e') : '#1e293b',
    score >= 2 ? (score === 2 ? '#f59e0b' : '#22c55e') : '#1e293b',
    score >= 3 ? '#22c55e' : '#1e293b',
  ]
  const label = score === 0 ? '' : score === 1 ? 'Fraca' : score === 2 ? 'Média' : 'Forte'
  const labelColor = score === 1 ? 'text-red-400' : score === 2 ? 'text-amber-400' : 'text-green-400'

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {bars.map((color, i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300" style={{ background: color }} />
        ))}
      </div>
      {label && <p className={`text-xs mt-1 ${labelColor}`}>{label}</p>}
    </div>
  )
}

function TermsModal({ onClose }) {
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(2,6,23,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Termos de Uso e Política de Privacidade</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ width: 18, height: 18 }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', fontSize: '0.85rem', lineHeight: 1.7, color: '#94a3b8' }}>
          <p style={{ marginBottom: 12, fontSize: '0.8rem', color: '#64748b' }}>
            Última atualização: junho de 2026. Ao criar uma conta, você confirma que leu e concorda com os termos abaixo.
          </p>

          <Section title="1. Aceitação dos Termos">
            Ao se cadastrar na plataforma Aprova.se, você declara ter lido, compreendido e aceito integralmente estes Termos de Uso e a Política de Privacidade. Se você não concordar com qualquer disposição, não deverá usar a plataforma.
          </Section>

          <Section title="2. Uso Adequado da Plataforma">
            A Aprova.se é uma plataforma de organização de estudos para concursos públicos. O usuário se compromete a:
            <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 20 }}>
              <li>Utilizar a plataforma exclusivamente para fins lícitos e educacionais;</li>
              <li>Não compartilhar suas credenciais de acesso com terceiros;</li>
              <li>Não tentar acessar funcionalidades, contas ou dados de outros usuários;</li>
              <li>Não utilizar a plataforma para qualquer atividade ilegal, fraudulenta ou prejudicial;</li>
              <li>Não realizar engenharia reversa, copiar ou redistribuir qualquer parte do sistema sem autorização expressa.</li>
            </ul>
          </Section>

          <Section title="3. Conduta no Chat e Sala de Estudos">
            A plataforma disponibiliza recursos de comunicação entre usuários (chat e sala de estudos virtuais). O usuário se compromete expressamente a:
            <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 20 }}>
              <li>Manter linguagem respeitosa e adequada em todas as interações;</li>
              <li>Não publicar conteúdo ofensivo, discriminatório, racista, sexista, homofóbico ou que incite o ódio;</li>
              <li>Não assediar, intimidar ou ameaçar outros usuários;</li>
              <li>Não compartilhar conteúdo ilegal, pornográfico ou violento;</li>
              <li>Não fazer spam, publicidade não autorizada ou divulgar links maliciosos;</li>
              <li>Não se passar por outra pessoa ou entidade.</li>
            </ul>
            O descumprimento dessas regras pode resultar em suspensão ou encerramento imediato da conta, sem aviso prévio.
          </Section>

          <Section title="4. Propriedade Intelectual">
            Todo o conteúdo original da plataforma — incluindo mas não se limitando ao código-fonte, design, textos, metodologias de estudo, ferramentas e funcionalidades — é de propriedade exclusiva da Aprova.se e protegido pelas leis brasileiras de propriedade intelectual (Lei nº 9.610/1998). É vedada a reprodução total ou parcial sem autorização prévia por escrito.
          </Section>

          <Section title="5. Privacidade e LGPD">
            A Aprova.se trata seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Coletamos apenas os dados necessários para o funcionamento da plataforma (nome, e-mail, preferências de estudo e dados de uso). Seus dados:
            <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 20 }}>
              <li>Não são vendidos a terceiros;</li>
              <li>São armazenados com segurança e protegidos por criptografia;</li>
              <li>Podem ser excluídos mediante solicitação ao suporte;</li>
              <li>Você tem o direito de acessar, corrigir e portabilizar seus dados a qualquer momento.</li>
            </ul>
            Utilizamos cookies próprios para manter sua sessão ativa e melhorar sua experiência. Não utilizamos cookies de rastreamento de terceiros para fins publicitários.
          </Section>

          <Section title="6. Conta e Segurança">
            Você é responsável pela confidencialidade de sua senha e por todas as atividades realizadas em sua conta. Em caso de acesso não autorizado suspeito, notifique-nos imediatamente. A Aprova.se não se responsabiliza por danos decorrentes do uso não autorizado de sua conta por falha de guarda de credenciais por parte do usuário.
          </Section>

          <Section title="7. Suspensão e Encerramento">
            A Aprova.se reserva-se o direito de suspender ou encerrar contas que violem estes Termos, utilizem a plataforma de forma abusiva, ou cujas atividades coloquem em risco a segurança ou integridade do sistema ou de outros usuários. Em casos graves, poderemos reportar atividades às autoridades competentes.
          </Section>

          <Section title="8. Limitação de Responsabilidade">
            A plataforma é fornecida "no estado em que se encontra". A Aprova.se não garante disponibilidade ininterrupta e não se responsabiliza por perdas de dados causadas por falhas técnicas, ataques externos ou fatores fora de seu controle razoável.
          </Section>

          <Section title="9. Alterações nos Termos">
            Podemos atualizar estes Termos a qualquer momento. Mudanças significativas serão comunicadas por e-mail ou notificação na plataforma com antecedência mínima de 15 dias. O uso continuado após a vigência das alterações implica aceitação dos novos termos.
          </Section>

          <Section title="10. Foro e Legislação Aplicável">
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Porto Alegre/RS para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
          </Section>

          <p style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(124,58,237,0.08)', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: '0.8rem' }}>
            Dúvidas? Entre em contato: suporte@aprova.se
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 24px', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600,
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', cursor: 'pointer',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>{title}</h3>
      <div style={{ color: '#94a3b8' }}>{children}</div>
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (!termsAccepted) {
      setError('Você deve aceitar os Termos de Uso e Privacidade para criar uma conta.')
      return
    }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password, termsAccepted)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Crie sua conta</h1>
          <p className="text-slate-400 text-sm mt-1.5">Comece a estudar de forma inteligente hoje mesmo</p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 flex-shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nome</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <input
                type="text"
                required
                autoFocus
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Seu nome completo"
                className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="seu@email.com"
                className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Senha</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#1e293b] border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>

          {/* Terms checkbox */}
          <div
            className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer select-none"
            style={{ background: termsAccepted ? 'rgba(124,58,237,0.08)' : 'rgba(30,41,59,0.5)', border: `1px solid ${termsAccepted ? 'rgba(124,58,237,0.3)' : '#1e293b'}`, transition: 'all 0.2s' }}
            onClick={() => setTermsAccepted(v => !v)}
          >
            <div
              style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                border: `2px solid ${termsAccepted ? '#7c3aed' : '#475569'}`,
                background: termsAccepted ? '#7c3aed' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {termsAccepted && (
                <svg viewBox="0 0 12 9" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 8 }}>
                  <path d="M1 4.5L4.5 8L11 1" />
                </svg>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Li e aceito os{' '}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowTerms(true) }}
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors font-medium"
              >
                Termos de Uso e Política de Privacidade
              </button>
              {' '}da Aprova.se
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-violet-900/30 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Criando conta...
              </span>
            ) : 'Criar conta grátis'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Entrar
          </Link>
        </p>

      </div>
    </AuthLayout>
  )
}
