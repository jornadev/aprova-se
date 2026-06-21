import { useState, useEffect, useMemo, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import Card from '../components/ui/Card'
import { statsApi } from '../services/api'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

// ── Helpers ───────────────────────────────────────────────────────
function formatHours(minutes) {
  if (!minutes || minutes === 0) return '0h'
  const h = minutes / 60
  if (h >= 100) return `${Math.round(h)}h`
  if (h >= 10)  return `${Math.round(h)}h`
  return `${Math.round(h * 10) / 10}h`
}

function formatMinutesShort(min) {
  if (!min || min === 0) return '-'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  return `${h}h${m > 0 ? String(m).padStart(2, '0') + 'min' : ''}`
}

function fmtNum(n) {
  if (n == null) return '0'
  return n.toLocaleString('pt-BR')
}

function computeStreaks(calendarData) {
  const map = {}
  calendarData.forEach(d => { map[d.date] = d.minutes })
  const today = new Date()
  const key = (d) => d.toISOString().slice(0, 10)
  const todayKey = key(today)
  const yesterday = new Date(today.getTime() - 86400000)
  const yesterdayKey = key(yesterday)

  let current = 0
  const startOffset = (map[todayKey] || 0) > 0 ? 0 : ((map[yesterdayKey] || 0) > 0 ? 1 : -1)
  if (startOffset >= 0) {
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000)
      if ((map[key(d)] || 0) > 0) current++
      else break
    }
  }

  let best = 0, run = 0
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    if ((map[key(d)] || 0) > 0) { run++; if (run > best) best = run }
    else run = 0
  }

  return { current, best }
}

function mergeSubjectData(bySubject, accuracy) {
  const map = {}
  bySubject.forEach(s => {
    map[s.subjectId] = { ...s, correct: 0, wrong: 0, total: 0, accuracy: null }
  })
  accuracy.forEach(a => {
    if (map[a.subjectId]) {
      map[a.subjectId].correct  = a.correct
      map[a.subjectId].wrong    = a.wrong
      map[a.subjectId].total    = a.total
      map[a.subjectId].accuracy = a.accuracy
    } else {
      map[a.subjectId] = { ...a, hours: 0 }
    }
  })
  return Object.values(map).sort((a, b) => (b.hours || 0) - (a.hours || 0))
}

// ── Tooltip (built per render inside Stats) ───────────────────────
function buildTT(isDark) {
  return {
    contentStyle: isDark ? {
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 10,
      fontSize: 12,
      color: '#e2e8f0',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    } : {
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: 10,
      fontSize: 12,
      color: '#0f172a',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    },
    labelStyle: { color: isDark ? '#94a3b8' : '#64748b', marginBottom: 2 },
    cursor: { fill: isDark ? 'rgba(148,163,184,0.04)' : 'rgba(0,0,0,0.03)' },
  }
}

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent = '#7c3aed' }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ background: `radial-gradient(circle at top right, ${accent} 0%, transparent 70%)` }}
      />
      <div className="relative space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest leading-none" style={{ color: 'var(--text-fad)' }}>{label}</p>
        <p className="text-3xl font-black leading-none tracking-tight" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-xs leading-tight pt-0.5" style={{ color: 'var(--text-mut)' }}>{sub}</p>}
      </div>
    </Card>
  )
}

// ── Heatmap (GitHub-style, full-width, 52 weeks) ──────────────────
const PT_MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function buildWeeks(map) {
  const today = new Date()
  const todayKey = localDateKey(today)

  // Start from the Monday of the week containing (today - 364 days)
  const start = new Date(today)
  start.setDate(start.getDate() - 364)
  const dow = start.getDay()
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1)) // roll back to Monday

  const weeks = []
  const cur = new Date(start)
  while (true) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const key = localDateKey(cur)
      week.push({
        date: key,
        minutes: map[key] || 0,
        isToday: key === todayKey,
        isFuture: key > todayKey,
      })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
    if (localDateKey(cur) > todayKey) break
    if (weeks.length > 55) break // safety
  }
  return weeks
}

function Heatmap({ data, isDark }) {
  const map = useMemo(() => {
    const m = {}
    data.forEach(d => { m[d.date] = d.minutes })
    return m
  }, [data])

  const weeks = useMemo(() => buildWeeks(map), [map])

  const containerRef = useRef(null)
  const [cellSize, setCellSize] = useState(12)

  useEffect(() => {
    if (!containerRef.current) return
    const DAY_LABEL_W = 28
    const GAP = 3
    const compute = () => {
      const w = containerRef.current.clientWidth
      const size = Math.floor((w - DAY_LABEL_W - GAP - weeks.length * GAP) / weeks.length)
      setCellSize(Math.max(8, Math.min(18, size)))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [weeks.length])

  const monthLabels = useMemo(() => weeks.map((week, wi) => {
    const d = new Date(week[0].date + 'T12:00:00')
    if (wi === 0) return PT_MONTHS_SHORT[d.getMonth()]
    const prev = new Date(weeks[wi - 1][0].date + 'T12:00:00')
    return d.getMonth() !== prev.getMonth() ? PT_MONTHS_SHORT[d.getMonth()] : null
  }), [weeks])

  const getColor = (minutes, isFuture) => {
    if (isFuture) return isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'
    if (minutes === 0) return isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
    if (minutes < 30)  return isDark ? '#3b0764' : '#ede9fe'
    if (minutes < 60)  return isDark ? '#6d28d9' : '#c4b5fd'
    if (minutes < 120) return isDark ? '#7c3aed' : '#8b5cf6'
    if (minutes < 180) return isDark ? '#8b5cf6' : '#7c3aed'
    return '#6d28d9'
  }

  const PT_DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const formatTip = (date, minutes) => {
    const d = new Date(date + 'T12:00:00')
    const h = Math.round(minutes / 60 * 10) / 10
    return `${PT_DAY_NAMES[d.getDay()]} ${d.getDate()} ${PT_MONTHS_SHORT[d.getMonth()]}: ${h > 0 ? h + 'h' : 'sem estudo'}`
  }

  const GAP = 3
  const MONTH_H = 16
  const DAY_LABEL_W = 28

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: GAP }}>

        {/* Day-of-week labels, aligned with cells */}
        <div style={{
          width: DAY_LABEL_W,
          flexShrink: 0,
          paddingTop: MONTH_H + GAP,
          display: 'flex',
          flexDirection: 'column',
          gap: GAP,
        }}>
          {['Seg', '', 'Ter', '', 'Qui', '', 'Dom'].map((label, i) => (
            <div key={i} style={{
              height: cellSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 5,
            }}>
              <span style={{ fontSize: 9, color: '#475569', lineHeight: 1 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div style={{ flex: 1, display: 'flex', gap: GAP, minWidth: 0 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: GAP, minWidth: 0 }}>
              {/* Month label */}
              <div style={{ height: MONTH_H, display: 'flex', alignItems: 'flex-end' }}>
                {monthLabels[wi] && (
                  <span style={{ fontSize: 10, color: '#64748b', lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {monthLabels[wi]}
                  </span>
                )}
              </div>
              {/* Day cells */}
              {week.map(d => (
                <div
                  key={d.date}
                  title={formatTip(d.date, d.minutes)}
                  style={{
                    height: cellSize,
                    flexShrink: 0,
                    borderRadius: 2,
                    background: getColor(d.minutes, d.isFuture),
                    outline: d.isToday ? '2px solid #a78bfa' : 'none',
                    outlineOffset: 1,
                    boxShadow: d.minutes >= 180 ? `0 0 5px ${getColor(d.minutes, false)}aa` : 'none',
                    cursor: 'default',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, paddingLeft: DAY_LABEL_W + GAP }}>
        <span style={{ fontSize: 10, color: '#475569' }}>menos</span>
        {[0, 30, 60, 120, 180, 240].map((m, i) => (
          <div key={i} style={{
            width: cellSize > 10 ? 12 : 10,
            height: cellSize > 10 ? 12 : 10,
            borderRadius: 2,
            background: getColor(m === 0 ? 0 : m, false),
            border: m === 0 ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'}` : 'none',
          }}/>
        ))}
        <span style={{ fontSize: 10, color: '#475569' }}>mais</span>
      </div>
    </div>
  )
}

// ── Subject Breakdown ─────────────────────────────────────────────
function SubjectRow({ subject, maxHours }) {
  const pct = maxHours > 0 ? Math.min(((subject.hours || 0) / maxHours) * 100, 100) : 0
  const acc = subject.accuracy

  return (
    <div className="flex items-center gap-3 py-3 last:border-0" style={{ borderBottom: '1px solid var(--bdr)' }}>
      <div className="w-1 h-10 rounded-full shrink-0" style={{ background: subject.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-sm font-semibold truncate pr-2" style={{ color: 'var(--text-2)' }}>{subject.name}</span>
          <span className="text-sm font-bold shrink-0" style={{ color: 'var(--text)' }}>{formatHours((subject.hours || 0) * 60)}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bdr)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: subject.color }}
          />
        </div>
      </div>
      <div className="w-20 text-right shrink-0">
        {subject.total > 0 ? (
          <>
            <div className={`text-sm font-bold ${
              acc >= 70 ? 'text-green-400' : acc >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>{acc}%</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-mut)' }}>{fmtNum(subject.total)} quest.</div>
          </>
        ) : (
          <div className="text-xs" style={{ color: 'var(--text-ghost)' }}>—</div>
        )}
      </div>
    </div>
  )
}

// ── Accuracy Empty State ──────────────────────────────────────────
function EmptyTrend() {
  return (
    <div className="flex flex-col items-center justify-center h-[220px] gap-2">
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-elev)' }}>
        <svg viewBox="0 0 20 20" className="w-5 h-5" style={{ fill: 'var(--text-ghost)' }}>
          <path d="M2 11l4-4 4 4 4-6 4 4v6H2z" opacity=".5"/>
          <path d="M2 13l4-4 4 4 4-6 4 4"/>
        </svg>
      </div>
      <p className="text-xs text-center max-w-[180px]" style={{ color: 'var(--text-mut)' }}>
        Registre acertos e erros nas sessões para ver a tendência de aproveitamento.
      </p>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function Stats() {
  const { isDark } = useTheme()
  const toast = useToast()
  const [summary,  setSummary]  = useState(null)
  const [weekly,   setWeekly]   = useState([])
  const [bySubject,setBySubject]= useState([])
  const [calendar, setCalendar] = useState([])
  const [accuracy, setAccuracy] = useState([])
  const [trend,    setTrend]    = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetchAll = () => Promise.all([
    statsApi.getSummary(),
    statsApi.getWeekly(),
    statsApi.getSubjects(),
    statsApi.getCalendar(),
    statsApi.getAccuracy(),
    statsApi.getAccuracyTrend(),
  ]).then(([s, w, sub, c, a, t]) => {
    setSummary(s); setWeekly(w); setBySubject(sub)
    setCalendar(c); setAccuracy(a); setTrend(t)
  })

  useEffect(() => {
    fetchAll()
      .catch(() => toast.error('Erro ao carregar estatísticas.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onSave = () => fetchAll().catch(() => {})
    window.addEventListener('sessionSaved', onSave)
    return () => window.removeEventListener('sessionSaved', onSave)
  }, [])

  const streaks    = useMemo(() => computeStreaks(calendar), [calendar])
  const subjects   = useMemo(() => mergeSubjectData(bySubject, accuracy), [bySubject, accuracy])
  const maxHours   = useMemo(() => Math.max(1, ...subjects.map(s => s.hours || 0)), [subjects])
  const hasTrend   = trend.some(t => t.accuracy !== null)
  const TT         = buildTT(isDark)
  const gridStroke = isDark ? '#1e293b' : 'rgba(0,0,0,0.06)'

  if (loading) return (
    <div className="flex items-center gap-1.5 py-20 justify-center">
      {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>)}
    </div>
  )

  const totalH   = summary?.totalMinutes ?? 0
  const sessions = summary?.totalSessions ?? 0
  const questions= summary?.totalQuestions ?? 0
  const acc      = summary?.overallAccuracy ?? 0
  const sessWeek = summary?.sessionsThisWeek ?? 0
  const avgMin   = summary?.avgSessionMin ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Estatísticas</h1>
        <p className="text-sm" style={{ color: 'var(--text-fad)' }}>Análise detalhada do seu desempenho</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard
          label="Horas estudadas"
          value={formatHours(totalH)}
          sub={`${fmtNum(sessions)} sessões registradas`}
          accent="#7c3aed"
        />
        <KpiCard
          label="Questões respondidas"
          value={fmtNum(questions)}
          sub={questions > 0 ? `${summary.totalCorrect} acertos · ${summary.totalWrong} erros` : 'Sem dados ainda'}
          accent="#2563eb"
        />
        <KpiCard
          label="Aproveitamento geral"
          value={questions > 0 ? `${acc}%` : '—'}
          sub={questions > 0 ? (acc >= 70 ? 'Acima da meta' : acc >= 50 ? 'Pode melhorar' : 'Precisa de atenção') : 'Registre acertos nas sessões'}
          accent={questions > 0 ? (acc >= 70 ? '#22c55e' : acc >= 50 ? '#eab308' : '#ef4444') : '#475569'}
        />
        <KpiCard
          label="Sequência atual"
          value={streaks.current > 0 ? `${streaks.current}d` : '—'}
          sub={streaks.current > 0 ? `${streaks.current === 1 ? 'dia em sequência' : 'dias em sequência'}` : 'Estude hoje para começar'}
          accent={streaks.current >= 7 ? '#f97316' : streaks.current > 0 ? '#eab308' : '#475569'}
        />
        <KpiCard
          label="Melhor sequência"
          value={streaks.best > 0 ? `${streaks.best}d` : '—'}
          sub="nos últimos 90 dias"
          accent="#0891b2"
        />
        <KpiCard
          label="Esta semana"
          value={String(sessWeek)}
          sub={avgMin > 0 ? `média de ${formatMinutesShort(avgMin)} por sessão` : 'sessões registradas'}
          accent="#059669"
        />
      </div>

      {/* Weekly + Accuracy trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-2)' }}>Horas por semana</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false}/>
              <XAxis dataKey="weekLabel" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip {...TT} formatter={v => [`${v}h`, 'Horas']}/>
              <Bar dataKey="hours" fill="url(#barGrad)" radius={[6, 6, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-2)' }}>Tendência de aproveitamento</h2>
          {hasTrend ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false}/>
                <XAxis dataKey="weekLabel" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <Tooltip {...TT} formatter={v => v != null ? [`${v}%`, 'Aproveitamento'] : ['-', 'Sem dados']}/>
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  fill="url(#accGrad)"
                  dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#a78bfa' }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyTrend />
          )}
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Contribuições — últimos 12 meses</h2>
          {streaks.current > 0 && (
            <span className="text-xs font-semibold text-orange-400">
              {streaks.current} {streaks.current === 1 ? 'dia' : 'dias'} consecutivos
            </span>
          )}
        </div>
        <Heatmap data={calendar} isDark={isDark} />
      </Card>

      {/* Subject breakdown */}
      {subjects.length > 0 && (
        <Card>
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Desempenho por disciplina</h2>
            <span className="text-xs" style={{ color: 'var(--text-mut)' }}>{subjects.length} disciplinas</span>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-ghost)' }}>Ordenado por horas estudadas. O % de aproveitamento considera todas as sessões.</p>
          <div>
            {subjects.map(s => (
              <SubjectRow key={s.subjectId} subject={s} maxHours={maxHours} />
            ))}
          </div>
        </Card>
      )}

      {/* Acertos/erros per subject — only if has question data */}
      {accuracy.length > 0 && accuracy.some(a => a.total > 0) && (
        <Card>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-2)' }}>Questões por disciplina</h2>
          <ResponsiveContainer width="100%" height={Math.max(180, accuracy.length * 44)}>
            <BarChart
              data={accuracy.filter(a => a.total > 0)}
              layout="vertical"
              margin={{ top: 0, right: 48, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false}/>
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={120}
                axisLine={false}
                tickLine={false}
                tickFormatter={n => n.length > 16 ? n.slice(0, 16) + '…' : n}
              />
              <Tooltip
                {...TT}
                formatter={(v, name) => [v, name === 'correct' ? 'Acertos' : 'Erros']}
              />
              <Bar dataKey="correct" name="correct" fill="#22c55e" radius={[0, 4, 4, 0]} stackId="a"/>
              <Bar dataKey="wrong"   name="wrong"   fill="#ef4444" radius={[0, 4, 4, 0]} stackId="a"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
