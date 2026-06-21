import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { cycleApi, sessionApi, weeklyPlanApi } from '../services/api'
import { useToast } from '../context/ToastContext'

const DAY_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const DAY_LABELS = { SUNDAY: 'Domingo', MONDAY: 'Segunda', TUESDAY: 'Terça', WEDNESDAY: 'Quarta', THURSDAY: 'Quinta', FRIDAY: 'Sexta', SATURDAY: 'Sábado' }

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtH(minutes) {
  if (!minutes) return '0min'
  const h = Math.floor(minutes / 60), m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}min`
}

export default function Cycle() {
  const toast = useToast()
  const [todayPlans, setTodayPlans] = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [todaySessions, setTodaySessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [stopModal, setStopModal] = useState(false)
  const [stopForm, setStopForm] = useState({ content: '', correctAnswers: '', wrongAnswers: '' })
  const [starting, setStarting] = useState(null)
  const [stopping, setStopping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAllSubjects, setShowAllSubjects] = useState(false)
  const timerRef = useRef(null)

  const todayKey = DAY_KEYS[new Date().getDay()]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const [plans, cycle, sessions] = await Promise.all([
        weeklyPlanApi.getAll(),
        cycleApi.get(),
        sessionApi.getHistory({ page: 0, size: 100, from: today + 'T00:00:00', to: today + 'T23:59:59' }),
      ])
      setTodayPlans((plans || []).filter(p => p.dayOfWeek === todayKey))
      setAllSubjects(cycle || [])
      setTodaySessions((sessions.content || []))
    } catch {
      toast.error('Erro ao carregar ciclo de estudos.')
    } finally {
      setLoading(false)
    }
  }, [todayKey])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [activeSession])

  const studiedMinutesBySubject = {}
  todaySessions.forEach(s => {
    const id = s.subject?.id
    if (!id) return
    studiedMinutesBySubject[id] = (studiedMinutesBySubject[id] || 0) + (s.duration || 0)
  })

  const startStudy = async (subject) => {
    setStarting(subject.id)
    try {
      const session = await sessionApi.start(subject.id)
      setActiveSession({ ...session, subjectName: subject.name, subjectColor: subject.color })
      setElapsed(0)
    } catch {
      toast.error('Erro ao iniciar sessão. Tente novamente.')
    } finally {
      setStarting(null)
    }
  }

  const openStop = () => {
    setStopForm({ content: '', correctAnswers: '', wrongAnswers: '' })
    setStopModal(true)
  }

  const confirmStop = async () => {
    setStopping(true)
    try {
      await sessionApi.stop(activeSession.id, {
        content: stopForm.content || null,
        correctAnswers: stopForm.correctAnswers ? +stopForm.correctAnswers : null,
        wrongAnswers: stopForm.wrongAnswers ? +stopForm.wrongAnswers : null,
      })
      setActiveSession(null)
      setElapsed(0)
      setStopModal(false)
      toast.success('Sessão salva com sucesso!')
      window.dispatchEvent(new Event('sessionSaved'))
      load()
    } catch {
      toast.error('Erro ao encerrar sessão. Tente novamente.')
    } finally {
      setStopping(false)
    }
  }

  const plannedSubjectIds = todayPlans.map(p => p.subject?.id)
  const otherSubjects = allSubjects.filter(s => !plannedSubjectIds.includes(s.id))
  const totalPlannedMin = todayPlans.reduce((s, p) => s + p.targetMinutes, 0)
  const totalStudiedMin = Object.values(studiedMinutesBySubject).reduce((a, b) => a + b, 0)

  if (loading) return (
    <div className="flex items-center gap-1.5 py-20 justify-center">
      {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Ciclo de Estudos</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            {DAY_LABELS[todayKey]} — {todayPlans.length > 0
              ? `${todayPlans.length} ${todayPlans.length === 1 ? 'matéria planejada' : 'matérias planejadas'}`
              : 'Nenhuma matéria planejada para hoje'}
          </p>
        </div>
        {totalPlannedMin > 0 && (
          <div className="text-right">
            <div className="text-sm font-bold" style={{ color: totalStudiedMin >= totalPlannedMin ? '#22c55e' : '#a78bfa' }}>
              {fmtH(totalStudiedMin)} / {fmtH(totalPlannedMin)}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-mut)' }}>estudado hoje</div>
          </div>
        )}
      </div>

      {/* Active session */}
      {activeSession && (
        <div className="rounded-2xl p-5"
          style={{ background: `${activeSession.subjectColor}10`, border: `1px solid ${activeSession.subjectColor}30` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-fad)' }}>Estudando agora</p>
              <p className="text-lg font-bold mt-1" style={{ color: activeSession.subjectColor }}>{activeSession.subjectName}</p>
              <p className="text-4xl font-mono font-bold mt-2" style={{ color: 'var(--text)' }}>{formatTime(elapsed)}</p>
            </div>
            <Button variant="danger" size="lg" onClick={openStop}>Parar</Button>
          </div>
        </div>
      )}

      {/* Today's planned subjects */}
      {todayPlans.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest uppercase px-1" style={{ color: 'var(--text-fad)' }}>
            Plano de hoje
          </span>
          <div className="space-y-2">
            {todayPlans.map(plan => {
              const sub = plan.subject
              const studied = studiedMinutesBySubject[sub?.id] || 0
              const target = plan.targetMinutes
              const pct = target > 0 ? Math.min(100, Math.round((studied / target) * 100)) : 0
              const done = pct >= 100

              return (
                <div key={plan.id} className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--row-bg)', border: `1px solid ${done ? '#22c55e30' : 'var(--bdr)'}` }}>
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ background: sub?.color || '#7c3aed' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{sub?.name}</p>
                        {done && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">concluído</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bdr)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: done ? '#22c55e' : sub?.color || '#7c3aed' }} />
                        </div>
                        <span className="text-xs font-medium flex-shrink-0" style={{ color: done ? '#22c55e' : 'var(--text-3)' }}>
                          {fmtH(studied)} / {fmtH(target)}
                        </span>
                      </div>
                    </div>
                    {!activeSession && !done && (
                      <Button onClick={() => startStudy(sub)} disabled={!!starting} size="sm">
                        {starting === sub?.id ? '...' : 'Estudar'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state - no plan for today */}
      {todayPlans.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>
            Nenhuma matéria planejada para {DAY_LABELS[todayKey].toLowerCase()}.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-mut)' }}>
            <Link to="/weekly-plan" className="text-violet-400 hover:underline">Configure seu planejamento semanal</Link> ou escolha uma matéria abaixo.
          </p>
        </div>
      )}

      {/* Other subjects (fallback / extra study) */}
      {otherSubjects.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowAllSubjects(!showAllSubjects)}
            className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-1 transition-colors"
            style={{ color: 'var(--text-mut)' }}
          >
            <span>Outras disciplinas</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              className={`w-3.5 h-3.5 transition-transform ${showAllSubjects ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showAllSubjects && (
            <div className="space-y-1.5">
              {otherSubjects.map(s => {
                const studied = studiedMinutesBySubject[s.id] || 0
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{s.name}</p>
                      {studied > 0 && (
                        <p className="text-[11px]" style={{ color: 'var(--text-mut)' }}>{fmtH(studied)} estudado hoje</p>
                      )}
                    </div>
                    {!activeSession && (
                      <Button onClick={() => startStudy(s)} disabled={!!starting} size="sm" variant="ghost">
                        {starting === s.id ? '...' : 'Estudar'}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Progress summary */}
      {totalPlannedMin > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-fad)' }}>Progresso do dia</span>
            <span className="text-sm font-bold" style={{ color: totalStudiedMin >= totalPlannedMin ? '#22c55e' : '#a78bfa' }}>
              {Math.min(100, Math.round((totalStudiedMin / totalPlannedMin) * 100))}%
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'var(--bdr)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.round((totalStudiedMin / totalPlannedMin) * 100))}%`,
                background: totalStudiedMin >= totalPlannedMin ? '#22c55e' : 'linear-gradient(90deg,#7c3aed,#a78bfa)',
              }} />
          </div>
        </div>
      )}

      <Modal open={stopModal} onClose={() => !stopping && setStopModal(false)} title="Encerrar Sessão">
        <div className="space-y-4">
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elev)' }}>
            <p className="text-sm" style={{ color: 'var(--text-fad)' }}>Tempo estudado</p>
            <p className="text-3xl font-mono font-bold" style={{ color: 'var(--text)' }}>{formatTime(elapsed)}</p>
          </div>
          <Input label="Conteúdo estudado (opcional)" value={stopForm.content} onChange={e => setStopForm(f => ({ ...f, content: e.target.value }))} placeholder="Ex: Capítulo 3 - Verbos" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Acertos" type="number" min={0} value={stopForm.correctAnswers} onChange={e => setStopForm(f => ({ ...f, correctAnswers: e.target.value }))} placeholder="0" />
            <Input label="Erros" type="number" min={0} value={stopForm.wrongAnswers} onChange={e => setStopForm(f => ({ ...f, wrongAnswers: e.target.value }))} placeholder="0" />
          </div>
          <div className="flex gap-3">
            <Button onClick={confirmStop} disabled={stopping} className="flex-1">
              {stopping ? 'Salvando...' : 'Salvar e encerrar'}
            </Button>
            <Button variant="ghost" onClick={() => setStopModal(false)} disabled={stopping} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
