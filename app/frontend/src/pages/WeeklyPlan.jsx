import { useState, useEffect, useRef } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { weeklyPlanApi, subjectApi, preferencesApi } from '../services/api'
import { useToast } from '../context/ToastContext'

const DAYS = [
  { key: 'MONDAY',    short: 'Seg', label: 'Segunda-feira' },
  { key: 'TUESDAY',   short: 'Ter', label: 'Terça-feira'   },
  { key: 'WEDNESDAY', short: 'Qua', label: 'Quarta-feira'  },
  { key: 'THURSDAY',  short: 'Qui', label: 'Quinta-feira'  },
  { key: 'FRIDAY',    short: 'Sex', label: 'Sexta-feira'   },
  { key: 'SATURDAY',  short: 'Sáb', label: 'Sábado'       },
  { key: 'SUNDAY',    short: 'Dom', label: 'Domingo'       },
]

const TODAY_KEY = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.key

function fmtH(minutes) {
  if (!minutes) return '0h'
  const h = Math.floor(minutes / 60), m = minutes % 60
  if (h === 0) return `${m}min`
  return `${h}h${m > 0 ? String(m).padStart(2,'0') : ''}`
}

// ── Add Plan Modal ────────────────────────────────────────────────
function AddModal({ open, defaultDay, subjects, onSave, onClose }) {
  const [dayOfWeek, setDay]     = useState(defaultDay || 'MONDAY')
  const [subjectId, setSubject] = useState('')
  const [minutes,   setMinutes] = useState(60)

  useEffect(() => {
    if (open) { setDay(defaultDay || 'MONDAY'); setSubject(''); setMinutes(60) }
  }, [open, defaultDay])

  if (!open) return null

  const handleSave = () => {
    if (!subjectId) return
    onSave({ dayOfWeek, subject: { id: +subjectId }, targetMinutes: +minutes })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
      <div
        className="relative z-10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-md)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text)' }}>Adicionar ao planejamento</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-3)' }}>Dia da semana</label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map(d => (
                <button
                  key={d.key}
                  onClick={() => setDay(d.key)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    dayOfWeek === d.key ? 'bg-violet-600 text-white' : ''
                  }`}
                  style={dayOfWeek !== d.key ? { background: 'var(--bg-elev)', color: 'var(--text-3)' } : undefined}
                >
                  {d.short}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-3)' }}>Disciplina</label>
            <select
              value={subjectId}
              onChange={e => setSubject(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-colors"
              style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}
            >
              <option value="">Selecione...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Duração</label>
              <span className="text-sm font-bold text-violet-400">{fmtH(minutes)}</span>
            </div>
            <input
              type="range" min={15} max={300} step={15} value={minutes}
              onChange={e => setMinutes(+e.target.value)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #7c3aed ${((minutes-15)/285)*100}%, var(--bg-elev) ${((minutes-15)/285)*100}%)`,
                outline: 'none',
              }}
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-mut)' }}>
              <span>15min</span><span>1h</span><span>2h</span><span>3h</span><span>5h</span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} disabled={!subjectId} className="flex-1">Adicionar</Button>
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Plan Item (draggable) ─────────────────────────────────────────
function PlanItem({ plan, subject, dragging, onDragStart, onDragEnd, onDelete, onEditMinutes }) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(plan.targetMinutes)
  const inputRef = useRef(null)

  const startEdit = () => {
    setEditVal(plan.targetMinutes)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const saveEdit = () => {
    const v = Math.max(15, +editVal || plan.targetMinutes)
    if (v !== plan.targetMinutes) onEditMinutes(plan.id, v)
    setEditing(false)
  }

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(plan) }}
      onDragEnd={onDragEnd}
      className="group flex items-center gap-2 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing transition-all select-none"
      style={{
        opacity: dragging ? 0.4 : 1,
        background: 'var(--bg-elev)',
        border: '1px solid var(--bdr-md)',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--bdr-str)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bdr-md)'}
    >
      <div className="w-1 h-8 rounded-full shrink-0" style={{ background: subject?.color || '#7c3aed' }}/>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-2)' }}>{subject?.name}</p>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min={15}
            step={15}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
            className="w-16 text-xs rounded px-1.5 py-0.5 focus:outline-none"
            style={{ background: 'var(--bg-card)', border: '1px solid #7c3aed', color: 'var(--text)' }}
          />
        ) : (
          <p
            className="text-xs hover:text-violet-400 cursor-pointer transition-colors"
            style={{ color: 'var(--text-mut)' }}
            onClick={startEdit}
            title="Clique para editar"
          >
            {fmtH(plan.targetMinutes)}
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(plan.id)}
        className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all w-5 h-5 flex items-center justify-center"
        style={{ color: 'var(--text-mut)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  )
}

// ── Day Column ────────────────────────────────────────────────────
function DayColumn({ day, plans, subjects, dailyGoalMin, draggingPlan, dragOverDay, onDragOver, onDrop, onDragStart, onDragEnd, onDelete, onEditMinutes, onAdd }) {
  const isToday = day.key === TODAY_KEY
  const totalMin = plans.reduce((s, p) => s + p.targetMinutes, 0)
  const overGoal = dailyGoalMin > 0 && totalMin > dailyGoalMin * 1.15
  const atGoal   = dailyGoalMin > 0 && totalMin >= dailyGoalMin * 0.85 && totalMin <= dailyGoalMin * 1.15
  const isDragOver = dragOverDay === day.key

  return (
    <div
      className="flex flex-col min-w-0"
      onDragOver={e => onDragOver(e, day.key)}
      onDrop={e => onDrop(e, day.key)}
    >
      {/* Header */}
      <div
        className="rounded-t-xl px-3 py-2.5 border-b transition-colors"
        style={isToday
          ? { background: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.25)' }
          : isDragOver
          ? { background: 'var(--bg-elev)', borderColor: 'var(--bdr-str)' }
          : { background: 'var(--row-bg)', borderColor: 'var(--bdr)' }}
      >
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-violet-400' : ''}`}
            style={!isToday ? { color: 'var(--text-3)' } : undefined}>
            {day.short}
          </span>
          {isToday && (
            <span className="text-[9px] font-semibold bg-violet-600/30 text-violet-400 px-1.5 py-0.5 rounded-full">hoje</span>
          )}
        </div>
        {totalMin > 0 ? (
          <div className="flex items-baseline gap-1">
            <span className={`text-base font-black leading-none ${
              overGoal ? 'text-red-400' : atGoal ? 'text-green-400' : ''
            }`}
              style={!overGoal && !atGoal ? { color: 'var(--text-2)' } : undefined}>
              {fmtH(totalMin)}
            </span>
            {dailyGoalMin > 0 && (
              <span className="text-[10px]" style={{ color: 'var(--text-mut)' }}>/ {fmtH(dailyGoalMin)}</span>
            )}
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-mut)' }}>Livre</span>
        )}
      </div>

      {/* Items drop zone */}
      <div
        className="flex-1 rounded-b-xl border border-t-0 p-2 space-y-1.5 min-h-[120px] transition-colors"
        style={isDragOver
          ? { background: 'rgba(124,58,237,0.05)', borderColor: 'rgba(124,58,237,0.3)' }
          : { background: 'var(--row-bg)', borderColor: 'var(--bdr)' }}
      >
        {plans.map(plan => (
          <PlanItem
            key={plan.id}
            plan={plan}
            subject={subjects.find(s => s.id === plan.subject?.id)}
            dragging={draggingPlan?.id === plan.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDelete={onDelete}
            onEditMinutes={onEditMinutes}
          />
        ))}

        {isDragOver && draggingPlan && draggingPlan.dayOfWeek !== day.key && (
          <div className="h-10 rounded-lg border-2 border-dashed border-violet-500/50 bg-violet-500/5 flex items-center justify-center">
            <span className="text-xs text-violet-400">Soltar aqui</span>
          </div>
        )}

        <button
          onClick={() => onAdd(day.key)}
          className="w-full py-2 rounded-lg text-xs transition-all border border-dashed"
          style={{ color: 'var(--text-mut)', borderColor: 'var(--bdr-md)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'var(--row-bg)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mut)'; e.currentTarget.style.background = 'transparent' }}
        >
          + adicionar
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function WeeklyPlan() {
  const toast = useToast()
  const [plans,    setPlans]    = useState([])
  const [subjects, setSubjects] = useState([])
  const [progress, setProgress] = useState(null)
  const [prefs,    setPrefs]    = useState(null)
  const [modal,    setModal]    = useState(false)
  const [modalDay, setModalDay] = useState(null)

  const [draggingPlan, setDraggingPlan] = useState(null)
  const [dragOverDay,  setDragOverDay]  = useState(null)

  const load = async () => {
    try {
      const [p, s, pr] = await Promise.all([
        weeklyPlanApi.getAll(),
        subjectApi.getAll(),
        weeklyPlanApi.getProgress(),
      ])
      setPlans(p); setSubjects(s); setProgress(pr)
    } catch {
      toast.error('Erro ao carregar planejamento semanal.')
    }
  }

  useEffect(() => {
    load()
    preferencesApi.get()
      .then(raw => setPrefs({ dailyGoalHours: 4, weeklyGoalHours: 20, ...raw }))
      .catch(() => {})
  }, [])

  const handleSave = async (data) => {
    try {
      await weeklyPlanApi.create(data)
      setModal(false)
      load()
      toast.success('Planejamento salvo!')
    } catch {
      toast.error('Erro ao salvar planejamento.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await weeklyPlanApi.delete(id)
      load()
    } catch {
      toast.error('Erro ao excluir item do planejamento.')
    }
  }

  const handleEditMinutes = async (id, targetMinutes) => {
    try {
      await weeklyPlanApi.update(id, { targetMinutes })
      load()
    } catch {
      toast.error('Erro ao atualizar meta de tempo.')
    }
  }

  const handleDragStart = (plan) => setDraggingPlan(plan)
  const handleDragEnd   = ()     => { setDraggingPlan(null); setDragOverDay(null) }

  const handleDragOver = (e, dayKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(dayKey)
  }

  const handleDrop = async (e, dayKey) => {
    e.preventDefault()
    const plan = draggingPlan
    setDraggingPlan(null)
    setDragOverDay(null)
    if (plan && plan.dayOfWeek !== dayKey) {
      try {
        await weeklyPlanApi.update(plan.id, { dayOfWeek: dayKey })
        load()
      } catch {
        toast.error('Erro ao mover item. Tente novamente.')
        load()
      }
    }
  }

  const openAdd = (dayKey) => {
    setModalDay(dayKey)
    setModal(true)
  }

  const plansByDay = DAYS.reduce((acc, d) => {
    acc[d.key] = plans.filter(p => p.dayOfWeek === d.key)
    return acc
  }, {})

  const totalPlanned = plans.reduce((s, p) => s + p.targetMinutes, 0)
  const weeklyGoalMin = (prefs?.weeklyGoalHours || 0) * 60
  const dailyGoalMin  = (prefs?.dailyGoalHours  || 0) * 60

  const weeklyMatchPct = weeklyGoalMin > 0
    ? Math.min(100, Math.round((totalPlanned / weeklyGoalMin) * 100))
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Planejamento Semanal</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Grade de estudos por dia da semana</p>
        </div>
        <Button onClick={() => openAdd(TODAY_KEY)}>+ Adicionar</Button>
      </div>

      {/* Summary bar */}
      {(progress || totalPlanned > 0) && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold" style={{ color: 'var(--text-2)' }}>
                {fmtH(totalPlanned)} planejadas
              </span>
              {weeklyGoalMin > 0 && (
                <span style={{ color: 'var(--text-mut)' }}>de {fmtH(weeklyGoalMin)} de meta</span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {progress && (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  estudadas esta semana: <strong style={{ color: 'var(--text-2)' }}>{fmtH(progress.studiedMinutes)}</strong>
                </span>
              )}
              {weeklyMatchPct !== null && (
                <span className={`text-xs font-bold ${weeklyMatchPct >= 100 ? 'text-green-400' : weeklyMatchPct >= 80 ? 'text-yellow-400' : ''}`}
                  style={weeklyMatchPct < 80 ? { color: 'var(--text-3)' } : undefined}>
                  {weeklyMatchPct}% da meta
                </span>
              )}
            </div>
          </div>

          {/* Two stacked progress bars */}
          <div className="space-y-1.5">
            {weeklyGoalMin > 0 && (
              <div>
                <div className="flex justify-between text-[10px] mb-0.5" style={{ color: 'var(--text-mut)' }}>
                  <span>planejado</span>
                  <span>{weeklyMatchPct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elev)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${weeklyMatchPct}%`,
                      background: weeklyMatchPct >= 100 ? '#22c55e' : weeklyMatchPct >= 80 ? '#eab308' : '#7c3aed'
                    }}
                  />
                </div>
              </div>
            )}
            {progress && totalPlanned > 0 && (
              <div>
                <div className="flex justify-between text-[10px] mb-0.5" style={{ color: 'var(--text-mut)' }}>
                  <span>progresso da semana</span>
                  <span>{progress.progressPercent}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elev)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-green-500"
                    style={{ width: `${Math.min(100, progress.progressPercent)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 7-column grid */}
      <div className="overflow-x-auto pb-2">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', minWidth: 910 }}
          onDragLeave={(e) => {
            // Only clear dragOver if leaving the entire grid
            if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDay(null)
          }}
        >
          {DAYS.map(day => (
            <DayColumn
              key={day.key}
              day={day}
              plans={plansByDay[day.key]}
              subjects={subjects}
              dailyGoalMin={dailyGoalMin}
              draggingPlan={draggingPlan}
              dragOverDay={dragOverDay}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDelete={handleDelete}
              onEditMinutes={handleEditMinutes}
              onAdd={openAdd}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      {dailyGoalMin > 0 && (
        <div className="flex items-center gap-4 text-xs px-1" style={{ color: 'var(--text-mut)' }}>
          <span>Meta diária: {fmtH(dailyGoalMin)}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400"/>
            <span>dentro da meta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400"/>
            <span>acima da meta</span>
          </div>
          <span>Arraste os blocos para mudar de dia.</span>
        </div>
      )}

      <AddModal
        open={modal}
        defaultDay={modalDay}
        subjects={subjects}
        onSave={handleSave}
        onClose={() => setModal(false)}
      />
    </div>
  )
}
