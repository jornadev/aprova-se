import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { preferencesApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

const TABS = ['Conta', 'Metas', 'Pomodoro', 'Aparência']

const AVATAR_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#be185d','#4f46e5']
function avatarColor(id) { return AVATAR_COLORS[(id ?? 0) % AVATAR_COLORS.length] }

function daysUntil(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T12:00:00')
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
}

function SliderField({ label, value, min, max, step = 1, unit = '', onChange, tip, color = '#7c3aed' }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{label}</label>
        <span className="text-base font-bold tabular-nums" style={{ color }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${pct}%, var(--bdr-str) ${pct}%)`,
          outline: 'none',
        }}
      />
      {tip && <p className="text-xs mt-1.5" style={{ color: 'var(--text-mut)' }}>{tip}</p>}
    </div>
  )
}

// ── Conta ──────────────────────────────────────────────────────────
function ContaTab({ user, prefs, set }) {
  const color = avatarColor(user?.id)
  const initial = user?.name?.trim()[0]?.toUpperCase() ?? '?'
  const days = daysUntil(prefs.targetExamDate)

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-lg"
            style={{ background: color }}
          >
            {initial}
          </div>
          <div>
            <p className="text-lg font-bold leading-tight" style={{ color: 'var(--text)' }}>{user?.name ?? '...'}</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-mut)' }}>{user?.email}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Data alvo do concurso</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-mut)' }}>Usada para a contagem regressiva no painel.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={prefs.targetExamDate || ''}
            onChange={e => set('targetExamDate', e.target.value || null)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
          />
          {prefs.targetExamDate && (
            <button
              onClick={() => set('targetExamDate', null)}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 shrink-0"
            >
              Limpar
            </button>
          )}
        </div>

        {days !== null && (
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium border ${
            days > 30
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : days > 7
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              : days >= 0
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700/50'
          }`}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{
              background: days > 30 ? '#22c55e' : days > 7 ? '#eab308' : days >= 0 ? '#ef4444' : '#64748b'
            }}/>
            {days > 0
              ? <span><strong>{days} dias</strong> até o concurso</span>
              : days === 0
              ? <span>O concurso é <strong>hoje!</strong></span>
              : <span>Concurso passou há {Math.abs(days)} dias</span>
            }
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Metas ──────────────────────────────────────────────────────────
function MetasTab({ prefs, set }) {
  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Horas de estudo</h2>
        <SliderField
          label="Meta diária"
          value={prefs.dailyGoalHours}
          min={0.5} max={12} step={0.5} unit="h"
          onChange={v => set('dailyGoalHours', v)}
          tip="Horas de estudo por dia."
        />
        <SliderField
          label="Meta semanal"
          value={prefs.weeklyGoalHours}
          min={1} max={80} step={1} unit="h"
          color="#2563eb"
          onChange={v => set('weeklyGoalHours', v)}
          tip="Horas totais na semana."
        />
      </Card>

      <Card className="space-y-5">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Questões e dias</h2>
        <SliderField
          label="Questões por semana"
          value={prefs.weeklyGoalQuestions}
          min={0} max={500} step={10} unit=" questões"
          color="#0891b2"
          onChange={v => set('weeklyGoalQuestions', v)}
        />

        <div>
          <div className="flex justify-between items-baseline mb-3">
            <label className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Dias de estudo por semana</label>
            <span className="text-base font-bold text-violet-400">{prefs.studyDaysPerWeek} dias</span>
          </div>
          <div className="flex gap-1.5">
            {[1,2,3,4,5,6,7].map(d => (
              <button
                key={d}
                onClick={() => set('studyDaysPerWeek', d)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-150 ${
                  d <= prefs.studyDaysPerWeek
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-400'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-mut)' }}>Quantos dias por semana você pretende estudar.</p>
        </div>

        <SliderField
          label="Aproveitamento mínimo"
          value={prefs.minAccuracyPercent}
          min={50} max={100} step={5} unit="%"
          color="#059669"
          onChange={v => set('minAccuracyPercent', v)}
          tip="Você recebe um alerta quando seu aproveitamento cair abaixo desse valor."
        />
      </Card>
    </div>
  )
}

// ── Pomodoro ───────────────────────────────────────────────────────
function PomodoroPreview({ focusMin, shortBreakMin, longBreakMin }) {
  const total = 4 * focusMin + 3 * shortBreakMin + longBreakMin
  const segments = [
    { key: 'f1', w: focusMin / total,     color: '#ef4444' },
    { key: 's1', w: shortBreakMin / total, color: '#22c55e' },
    { key: 'f2', w: focusMin / total,     color: '#ef4444' },
    { key: 's2', w: shortBreakMin / total, color: '#22c55e' },
    { key: 'f3', w: focusMin / total,     color: '#ef4444' },
    { key: 's3', w: shortBreakMin / total, color: '#22c55e' },
    { key: 'f4', w: focusMin / total,     color: '#ef4444' },
    { key: 'l1', w: longBreakMin / total,  color: '#3b82f6' },
  ]
  return (
    <div>
      <p className="text-xs mb-2.5" style={{ color: 'var(--text-mut)' }}>Prévia de 1 ciclo completo ({total} min)</p>
      <div className="flex h-4 rounded-full overflow-hidden gap-px" style={{ background: 'var(--bg-elev)' }}>
        {segments.map(s => (
          <div
            key={s.key}
            className="h-full transition-all duration-300"
            style={{ width: `${s.w * 100}%`, background: s.color, opacity: 0.8 }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2.5">
        {[['#ef4444','Foco'],['#22c55e','Pausa curta'],['#3b82f6','Descanso longo']].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c }}/>
            <span className="text-xs" style={{ color: 'var(--text-mut)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PomodoroTab({ prefs, set }) {
  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Durações padrão</h2>
        <SliderField
          label="Tempo de foco"
          value={prefs.pomodoroFocusMin}
          min={15} max={60} step={5} unit=" min"
          color="#ef4444"
          onChange={v => set('pomodoroFocusMin', v)}
        />
        <SliderField
          label="Pausa curta"
          value={prefs.pomodoroShortBreakMin}
          min={1} max={15} step={1} unit=" min"
          color="#22c55e"
          onChange={v => set('pomodoroShortBreakMin', v)}
        />
        <SliderField
          label="Descanso longo"
          value={prefs.pomodoroLongBreakMin}
          min={5} max={30} step={5} unit=" min"
          color="#3b82f6"
          onChange={v => set('pomodoroLongBreakMin', v)}
        />
      </Card>

      <Card>
        <PomodoroPreview
          focusMin={prefs.pomodoroFocusMin}
          shortBreakMin={prefs.pomodoroShortBreakMin}
          longBreakMin={prefs.pomodoroLongBreakMin}
        />
      </Card>

      <p className="text-xs px-1" style={{ color: 'var(--text-mut)' }}>
        Ao salvar, as durações são aplicadas automaticamente ao Pomodoro da Sala de Estudos.
      </p>
    </div>
  )
}

// ── Aparência ──────────────────────────────────────────────────────
function AparenciaTab({ prefs, set }) {
  const { setTheme } = useTheme()

  const handleTheme = (id) => {
    set('theme', id)
    setTheme(id)
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Tema</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'dark',  label: 'Escuro',  desc: 'Recomendado para longas sessões de estudo.' },
            { id: 'light', label: 'Claro',   desc: 'Ideal com luz ambiente forte.'              },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => handleTheme(t.id)}
              className="p-4 rounded-xl border-2 text-left transition-all"
              style={{
                borderColor: prefs.theme === t.id ? '#7c3aed' : 'var(--bdr-md)',
                background: prefs.theme === t.id ? 'rgba(124,58,237,0.08)' : 'var(--bg-input)',
              }}
            >
              {/* Preview mini */}
              <div
                className="h-12 rounded-lg mb-3 border overflow-hidden flex items-end gap-1 px-2 pb-2"
                style={{
                  background: t.id === 'dark' ? '#080d1a' : '#f1f5f9',
                  borderColor: t.id === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                }}
              >
                <div className="flex-1 rounded" style={{ height: 18, background: t.id === 'dark' ? '#1e293b' : '#ffffff', border: `1px solid ${t.id === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}/>
                <div className="rounded" style={{ width: 14, height: 24, background: t.id === 'dark' ? '#7c3aed' : '#7c3aed', opacity: 0.8 }}/>
              </div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: prefs.theme === t.id ? '#7c3aed' : 'var(--text-2)' }}>
                {t.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-mut)' }}>{t.desc}</p>
            </button>
          ))}
        </div>
        <p className="text-xs px-0.5" style={{ color: 'var(--text-mut)' }}>
          O tema é aplicado imediatamente. Salve para persistir entre sessões.
        </p>
      </Card>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────
const DEFAULTS = {
  dailyGoalHours: 4,
  weeklyGoalHours: 20,
  weeklyGoalQuestions: 200,
  theme: 'dark',
  targetExamDate: null,
  minAccuracyPercent: 70,
  studyDaysPerWeek: 5,
  pomodoroFocusMin: 25,
  pomodoroShortBreakMin: 5,
  pomodoroLongBreakMin: 15,
}

export default function Preferences() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const [prefs, setPrefs] = useState(null)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    preferencesApi.get()
      .then(raw => {
        const merged = { ...DEFAULTS, ...raw }
        merged.theme = theme
        setPrefs(merged)
      })
      .catch(() => {
        setPrefs({ ...DEFAULTS, theme })
        toast.error('Não foi possível carregar suas preferências. Usando valores padrão.')
      })
  }, [])

  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    try {
      await preferencesApi.update(prefs)
      localStorage.setItem('pomo-config', JSON.stringify({
        focusMin:      prefs.pomodoroFocusMin,
        shortBreakMin: prefs.pomodoroShortBreakMin,
        longBreakMin:  prefs.pomodoroLongBreakMin,
      }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      toast.success('Preferências salvas!')
    } catch {
      toast.error('Erro ao salvar preferências. Tente novamente.')
    }
  }

  if (!prefs) return <div className="text-slate-400 text-sm animate-pulse py-8 text-center">Carregando preferências...</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Preferências</h1>
        <p className="text-sm" style={{ color: 'var(--text-mut)' }}>Personalize sua experiência de estudos</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--bdr-md)' }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{
              borderColor: tab === i ? '#7c3aed' : 'transparent',
              color: tab === i ? '#7c3aed' : 'var(--text-mut)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <ContaTab user={user} prefs={prefs} set={set} />}
      {tab === 1 && <MetasTab prefs={prefs} set={set} />}
      {tab === 2 && <PomodoroTab prefs={prefs} set={set} />}
      {tab === 3 && <AparenciaTab prefs={prefs} set={set} />}

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} size="lg" className="flex-1">
          {saved ? 'Salvo com sucesso!' : 'Salvar alterações'}
        </Button>
        {saved && (
          <span className="text-sm text-green-400 font-medium whitespace-nowrap">Preferências atualizadas.</span>
        )}
      </div>
    </div>
  )
}
