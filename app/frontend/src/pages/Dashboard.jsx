import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { dashboardApi, sessionApi, subjectApi, preferencesApi, weeklyPlanApi, achievementApi, reportApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const ACHIEVEMENT_LABELS = {
  STREAK_7: 'Sequência de 7 dias', STREAK_30: 'Sequência de 30 dias', STREAK_100: 'Sequência de 100 dias',
  HOURS_10: '10 horas de estudo', HOURS_50: '50 horas de estudo', HOURS_100: '100 horas de estudo', HOURS_500: '500 horas de estudo',
  SESSIONS_50: '50 sessões', SESSIONS_100: '100 sessões',
  EDITAL_25: '25% do edital', EDITAL_50: '50% do edital', EDITAL_100: 'Edital completo',
  FIRST_SIMULATION: 'Primeiro simulado', FIRST_NOTE: 'Primeira anotação',
}
const ACHIEVEMENT_ICONS = {
  STREAK_7: '🔥', STREAK_30: '🔥', STREAK_100: '🔥',
  HOURS_10: '⏱', HOURS_50: '⏱', HOURS_100: '⏱', HOURS_500: '⏱',
  SESSIONS_50: '📚', SESSIONS_100: '📚',
  EDITAL_25: '📋', EDITAL_50: '📋', EDITAL_100: '📋',
  FIRST_SIMULATION: '🎯', FIRST_NOTE: '📝',
}

const QUOTES = [
  { text: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', author: 'Robert Collier' },
  { text: 'A disciplina é a ponte entre metas e realizações.', author: 'Jim Rohn' },
  { text: 'Persistência é o caminho do êxito.', author: 'Charles Chaplin' },
  { text: 'Quem tem um porquê para viver suporta quase qualquer como.', author: 'Friedrich Nietzsche' },
  { text: 'Estude enquanto outros dormem. Trabalhe enquanto outros descansam.', author: 'William A. Ward' },
  { text: 'Você não precisa ser excelente para começar, mas precisa começar para ser excelente.', author: 'Zig Ziglar' },
  { text: 'A força não vem de ganhar. Vem das dificuldades pelas quais você passou.', author: 'Arnold Schwarzenegger' },
  { text: 'O futuro pertence a quem acredita na beleza dos seus sonhos.', author: 'Eleanor Roosevelt' },
  { text: 'Invista em conhecimento. É o único investimento que sempre rende.', author: 'Benjamin Franklin' },
  { text: 'A educação é a arma mais poderosa que você pode usar para mudar o mundo.', author: 'Nelson Mandela' },
  { text: 'Somos o que repetidamente fazemos. A excelência, portanto, não é um ato, mas um hábito.', author: 'Aristóteles' },
  { text: 'O segredo para progredir é começar.', author: 'Mark Twain' },
  { text: 'Não é porque as coisas são difíceis que não ousamos. É porque não ousamos que são difíceis.', author: 'Sêneca' },
  { text: 'Acredite que você pode e você já está na metade do caminho.', author: 'Theodore Roosevelt' },
  { text: 'A jornada de mil milhas começa com um único passo.', author: 'Lao Tsé' },
]

function getDailyQuote() {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const day = Math.floor((new Date() - start) / 86400000)
  return QUOTES[day % QUOTES.length]
}

function getGreeting(name) {
  const h = new Date().getHours()
  const period = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return `${period}, ${(name || '').split(' ')[0]}`
}

function formatDate() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatHours(min) {
  if (!min) return '0min'
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}min`
}

function formatMinutes(min) {
  if (!min) return '-'
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}min`
}

// ── Big stat block ────────────────────────────────────────────────
function BigStat({ value, label, accent = '#7c3aed', sub }) {
  return (
    <div className="flex flex-col gap-1 px-6 py-5">
      <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: accent, opacity: 0.7 }}>{label}</span>
      <span className="text-4xl font-black tracking-tight leading-none" style={{ color: accent }}>{value}</span>
      {sub && <span className="text-xs mt-1" style={{ color: 'var(--text-fad)' }}>{sub}</span>}
    </div>
  )
}

// ── Streak dots ───────────────────────────────────────────────────
function StreakRow({ streak, last7Days }) {
  const today = new Date()
  const accent = streak >= 14 ? '#f97316' : streak >= 7 ? '#eab308' : '#f59e0b'
  const dots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const entry = (last7Days || []).find(e => e.date === key)
    return { key, label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.','').slice(0,1).toUpperCase(), studied: (entry?.hours || 0) > 0, isToday: i === 6 }
  })
  return (
    <div className="flex items-center gap-2 pt-1">
      {dots.map(d => (
        <div key={d.key} className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-full transition-all"
            style={{
              background: d.studied ? accent : 'var(--bdr)',
              outline: d.isToday ? `2px solid ${accent}50` : 'none',
              outlineOffset: 2,
              boxShadow: d.studied && d.isToday ? `0 0 10px ${accent}55` : 'none',
            }} />
          <span className="text-[9px] font-medium" style={{ color: 'var(--text-dim)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Exam Countdown ────────────────────────────────────────────────
function ExamCountdown({ targetExamDate }) {
  if (!targetExamDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exam = new Date(targetExamDate + 'T00:00:00')
  const days = Math.ceil((exam - today) / 86400000)
  if (days < 0) return null

  const accent = days > 90 ? '#22c55e' : days > 30 ? '#eab308' : '#ef4444'
  const fmtDate = exam.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  const pct = Math.min(100, ((365 - days) / 365) * 100)

  return (
    <div className="flex items-center gap-5 px-5 py-4 rounded-2xl"
      style={{ background: `${accent}08`, border: `1px solid ${accent}18` }}>
      <div className="text-center flex-shrink-0">
        <div className="text-4xl font-black tabular-nums leading-none" style={{ color: accent }}>{days}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: accent, opacity: 0.6 }}>dias</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{days === 0 ? 'O concurso é hoje!' : 'para o concurso'}</span>
          <span className="text-xs" style={{ color: 'var(--text-fad)' }}>{fmtDate}</span>
        </div>
        <div className="h-1 rounded-full" style={{ background: 'var(--bdr)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent, transition: 'width 1s ease' }} />
        </div>
      </div>
    </div>
  )
}

// ── Discipline table ──────────────────────────────────────────────
function DisciplineTable({ subjects, todaySessions }) {
  const bySubject = {}
  todaySessions.forEach(s => {
    const id = s.subject?.id; if (!id) return
    if (!bySubject[id]) bySubject[id] = { minutes: 0, correct: 0, wrong: 0 }
    bySubject[id].minutes  += s.duration || 0
    bySubject[id].correct  += s.correctAnswers || 0
    bySubject[id].wrong    += s.wrongAnswers || 0
  })

  const hasData = Object.keys(bySubject).length > 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-fad)' }}>
          Painel de hoje
        </span>
        {!hasData && <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>Nenhuma sessão registrada ainda</span>}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bdr)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--row-bg)', borderBottom: '1px solid var(--row-bdr)' }}>
              <th className="text-left py-3 px-4 font-medium text-xs" style={{ color: 'var(--text-fad)' }}>Disciplina</th>
              <th className="text-center py-3 px-4 font-medium text-xs" style={{ color: 'var(--text-fad)' }}>Tempo</th>
              <th className="text-center py-3 px-4 font-medium text-xs" style={{ color: '#22c55e', opacity: 0.7 }}>Acertos</th>
              <th className="text-center py-3 px-4 font-medium text-xs" style={{ color: '#ef4444', opacity: 0.7 }}>Erros</th>
              <th className="text-center py-3 px-4 font-medium text-xs" style={{ color: 'var(--text-fad)' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s, idx) => {
              const d = bySubject[s.id]
              const total = (d?.correct || 0) + (d?.wrong || 0)
              const pct = total > 0 ? Math.round((d.correct / total) * 100) : null
              const pctColor = pct === null ? null : pct >= 70 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'
              return (
                <tr key={s.id}
                  style={{
                    borderBottom: idx < subjects.length - 1 ? '1px solid var(--row-bdr)' : 'none',
                    background: d ? `${s.color}06` : 'transparent',
                  }}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="font-medium text-sm" style={{ color: d ? 'var(--text-on)' : 'var(--text-fad)' }}>
                        {s.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-sm" style={{ color: d ? 'var(--text-med)' : 'var(--text-ghost)' }}>
                    {d ? formatMinutes(d.minutes) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold" style={{ color: d?.correct ? '#22c55e' : 'var(--text-ghost)' }}>
                    {d?.correct || '—'}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold" style={{ color: d?.wrong ? '#ef4444' : 'var(--text-ghost)' }}>
                    {d?.wrong || '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {pct !== null
                      ? <span className="font-bold text-sm" style={{ color: pctColor }}>{pct}%</span>
                      : <span style={{ color: 'var(--text-ghost)' }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
            {subjects.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-xs" style={{ color: 'var(--text-ghost)' }}>Nenhuma disciplina cadastrada</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Custom bar ────────────────────────────────────────────────────
function CustomBar(props) {
  const { x, y, width, height, isToday } = props
  if (!height) return null
  return (
    <rect x={x} y={y} width={width} height={height} rx={6} ry={6}
      fill={isToday ? '#a78bfa' : '#7c3aed'} fillOpacity={isToday ? 1 : 0.5} />
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user }                          = useAuth()
  const { isDark }                        = useTheme()
  const [data,          setData]          = useState(null)
  const [subjects,      setSubjects]      = useState([])
  const [todaySessions, setTodaySessions] = useState([])
  const [todayPlans,    setTodayPlans]    = useState([])
  const [achievements,  setAchievements]  = useState([])
  const [prefs,         setPrefs]         = useState(null)
  const [loading,       setLoading]       = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const DAY_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
      const todayKey = DAY_KEYS[new Date().getDay()]
      const [dash, subs, sessions, allPlans] = await Promise.all([
        dashboardApi.get(),
        subjectApi.getAll(),
        sessionApi.getHistory({ page: 0, size: 100, from: today + 'T00:00:00', to: today + 'T23:59:59' }),
        weeklyPlanApi.getAll(),
      ])
      setData(dash); setSubjects(subs)
      setTodaySessions(sessions.content || [])
      setTodayPlans((allPlans || []).filter(p => p.dayOfWeek === todayKey))
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    window.addEventListener('sessionSaved', load)
    return () => window.removeEventListener('sessionSaved', load)
  }, [load])

  useEffect(() => {
    preferencesApi.get().then(raw => setPrefs({ dailyGoalHours: 4, weeklyGoalHours: 20, ...raw })).catch(() => {})
    achievementApi.check().then(newOnes => {
      if (newOnes && newOnes.length > 0) {
        newOnes.forEach(a => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', message: `Conquista desbloqueada: ${ACHIEVEMENT_LABELS[a.type] || a.type}` } })))
      }
    }).catch(() => {})
    achievementApi.getAll().then(setAchievements).catch(() => {})
  }, [])

  if (loading) return (
    <div className="flex items-center gap-1.5 py-20 justify-center">
      {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>)}
    </div>
  )

  if (!data) return (
    <div className="space-y-2 py-12">
      <p className="text-red-400 font-medium">Erro ao conectar com o backend.</p>
      <button onClick={load} className="text-violet-400 text-sm underline">Tentar novamente</button>
    </div>
  )

  const today = new Date().toISOString().slice(0, 10)
  const chartData = (data.last7Days || []).map(d => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.',''),
    isToday: d.date === today,
  }))

  const quote = getDailyQuote()
  const hoursToday = formatHours(Math.round((data.hoursToday || 0) * 60))
  const hoursWeek  = formatHours(Math.round((data.hoursWeek  || 0) * 60))
  const hoursMonth = formatHours(Math.round((data.hoursMonth || 0) * 60))
  const streak     = data.currentStreak || 0
  const streakAccent = streak >= 14 ? '#f97316' : streak >= 7 ? '#eab308' : streak > 0 ? '#f59e0b' : '#475569'

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{getGreeting(user?.name)}</h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-fad)' }}>{formatDate()}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right max-w-xs">
            <p className="text-xs italic leading-snug" style={{ color: 'var(--text-fad)' }}>"{quote.text}"</p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--text-ghost)' }}>— {quote.author}</p>
          </div>
          {data.todayRevisions > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm flex-shrink-0"
              style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)', color: '#fb923c' }}>
              <span className="font-bold">{data.todayRevisions}</span>
              <span className="text-xs opacity-80">revisões pendentes</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Exam countdown ── */}
      {prefs?.targetExamDate && <ExamCountdown targetExamDate={prefs.targetExamDate} />}

      {/* ── Stats strip ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0"
          style={{ borderColor: 'var(--bdr-fnt)' }}>
          <BigStat label="Hoje" value={hoursToday} accent="#a78bfa" sub="horas de estudo" />
          <BigStat label="Semana" value={hoursWeek} accent="#34d399" sub={prefs?.weeklyGoalHours ? `meta: ${prefs.weeklyGoalHours}h` : undefined} />
          <BigStat label="Mês" value={hoursMonth} accent="#818cf8" sub="total acumulado" />
          <div className="px-6 py-5 flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: streakAccent, opacity: 0.7 }}>Sequência</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black leading-none" style={{ color: streakAccent }}>{streak}</span>
              <span className="text-sm" style={{ color: 'var(--text-fad)' }}>{streak === 1 ? 'dia' : 'dias'}</span>
            </div>
            <StreakRow streak={streak} last7Days={data.last7Days} />
          </div>
        </div>
      </div>

      {/* ── Chart + Goals ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-fad)' }}>Últimos 7 dias</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold" style={{ color: '#a78bfa' }}>{hoursWeek} esta semana</span>
              <button onClick={() => reportApi.downloadWeekly().catch(() => {})}
                className="text-[10px] px-2 py-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-mut)', border: '1px solid var(--bdr-md)' }}
                title="Exportar relatório semanal em PDF">
                PDF
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: isDark ? 'rgba(148,163,184,0.35)' : '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: isDark ? 'rgba(148,163,184,0.25)' : '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: isDark ? 'rgba(148,163,184,0.6)' : '#64748b' }}
                formatter={v => [`${v}h`, 'Horas']}
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
              />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isToday ? '#a78bfa' : '#7c3aed'} fillOpacity={entry.isToday ? 1 : 0.45} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Goals + next */}
        <div className="flex flex-col gap-3">
          {/* Weekly goal */}
          <div className="rounded-2xl p-5 flex-1"
            style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-fad)' }}>Meta semanal</span>
              <span className="text-sm font-bold" style={{ color: data.weeklyGoalProgress >= 100 ? '#22c55e' : '#a78bfa' }}>
                {data.weeklyGoalProgress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--bdr)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, data.weeklyGoalProgress)}%`, background: data.weeklyGoalProgress >= 100 ? '#22c55e' : 'linear-gradient(90deg,#7c3aed,#a78bfa)' }} />
            </div>
            {prefs?.weeklyGoalHours && (
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                {data.hoursWeek}h de {prefs.weeklyGoalHours}h
              </p>
            )}
          </div>

          {/* Next in cycle */}
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-fad)' }}>Próxima no ciclo</span>
            <p className="font-semibold mt-2 text-sm leading-snug" style={{ color: 'var(--text)' }}>
              {data.nextSubjectInCycle || <span style={{ color: 'var(--text-ghost)' }}>Nenhuma</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Discipline painel ── */}
      <DisciplineTable subjects={subjects} todaySessions={todaySessions} />

      {/* ── Today's Plan ── */}
      {todayPlans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-fad)' }}>
              Planejado para hoje
            </span>
            <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              {formatHours(todayPlans.reduce((s, p) => s + p.targetMinutes, 0))} planejadas
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {todayPlans.map(plan => {
              const sub = subjects.find(s => s.id === plan.subject?.id)
              return (
                <div key={plan.id} className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                  style={{ background: `${sub?.color || '#7c3aed'}08`, border: `1px solid ${sub?.color || '#7c3aed'}20` }}>
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: sub?.color || '#7c3aed' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {sub?.name || 'Disciplina'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-fad)' }}>
                      {formatHours(plan.targetMinutes)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Achievements ── */}
      {achievements.length > 0 && (
        <div>
          <span className="text-xs font-bold tracking-widest uppercase px-1" style={{ color: 'var(--text-fad)' }}>
            Conquistas ({achievements.length})
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {achievements.map(a => (
              <div key={a.id} className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <span className="text-base">{ACHIEVEMENT_ICONS[a.type] || '⭐'}</span>
                <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>{ACHIEVEMENT_LABELS[a.type] || a.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
