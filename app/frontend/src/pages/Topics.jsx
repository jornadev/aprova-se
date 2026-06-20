import { useState, useEffect, useRef } from 'react'
import { examPlanApi, topicApi } from '../services/api'
import EditalImportModal from '../components/EditalImportModal'
import { useToast } from '../context/ToastContext'

const STATUS_CYCLE = ['NOT_STUDIED', 'STUDIED', 'MASTERED']
const STATUS_COLOR = { NOT_STUDIED: '#475569', STUDIED: '#f59e0b', MASTERED: '#22c55e' }
const STATUS_LABEL = { NOT_STUDIED: 'Não estudado', STUDIED: 'Estudado', MASTERED: 'Dominado' }

const FILTERS = [
  { key: 'ALL', label: 'Todos' },
  { key: 'NOT_STUDIED', label: 'Não estudado' },
  { key: 'STUDIED', label: 'Estudado' },
  { key: 'MASTERED', label: 'Dominado' },
]

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#7c3aed', '#ec4899']

// ─── TopicRow ────────────────────────────────────────────────────────────────

function TopicRow({ topic, onStatusChange, editMode, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(topic.title)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commitRename = () => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== topic.title) {
      onRename(topic.id, trimmed)
    } else {
      setTitle(topic.title)
    }
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') { setTitle(topic.title); setEditing(false) }
  }

  const cycle = () => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(topic.status) + 1) % STATUS_CYCLE.length]
    onStatusChange(topic.id, next)
  }

  return (
    <div
      className="flex items-center gap-3 py-2 px-4 rounded-lg transition-colors group"
      onMouseEnter={e => e.currentTarget.style.background = 'var(--row-bg)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Status circle — hidden in edit mode */}
      {!editMode && (
        <button
          onClick={cycle}
          title={STATUS_LABEL[topic.status]}
          className="w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all hover:scale-110"
          style={{
            borderColor: STATUS_COLOR[topic.status],
            background: topic.status !== 'NOT_STUDIED' ? STATUS_COLOR[topic.status] : 'transparent',
          }}
        />
      )}

      {/* Title or inline editor */}
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm px-2 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
          style={{
            background: 'var(--bg-elev)',
            border: '1px solid var(--bdr-md)',
            color: 'var(--text)',
          }}
        />
      ) : (
        <span
          className={`text-sm flex-1 ${topic.status === 'MASTERED' && !editMode ? 'line-through' : ''}`}
          style={{ color: topic.status === 'MASTERED' && !editMode ? 'var(--text-mut)' : 'var(--text-2)' }}
        >
          {topic.title}
        </span>
      )}

      {/* Status label on hover (non-edit) */}
      {!editMode && (
        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: STATUS_COLOR[topic.status] }}>
          {STATUS_LABEL[topic.status]}
        </span>
      )}

      {/* Edit mode actions */}
      {editMode && !editing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            title="Renomear tópico"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-violet-500/20 transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button
            onClick={() => onDelete(topic.id)}
            title="Remover tópico"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── NewTopicInput ────────────────────────────────────────────────────────────

function NewTopicInput({ subjectId, onCreated }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && value.trim()) {
      setSaving(true)
      try {
        await topicApi.create(subjectId, { title: value.trim() })
        setValue('')
        onCreated()
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <div className="px-4 py-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        placeholder="Novo tópico... (Enter para salvar)"
        className="w-full text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--bdr)',
          color: 'var(--text-2)',
        }}
      />
    </div>
  )
}

// ─── SubjectAccordion ─────────────────────────────────────────────────────────

function SubjectAccordion({ subjectData, onTopicStatusChange, forceOpen, editMode, onReload }) {
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(subjectData.name)
  const nameInputRef = useRef(null)

  const { id, name, color, totalTopics, studied, mastered, progressPercent, topics } = subjectData
  const isOpen = forceOpen || open

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  const commitRename = async () => {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== name) {
      await examPlanApi.updateSubject(id, { name: trimmed, color })
      onReload()
    } else {
      setNameValue(name)
    }
    setEditingName(false)
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') { setNameValue(name); setEditingName(false) }
  }

  const handleColorChange = async (newColor) => {
    await examPlanApi.updateSubject(id, { color: newColor })
    onReload()
  }

  const handleDeleteSubject = async () => {
    if (confirm(`Remover a disciplina "${name}" e todos os seus tópicos?`)) {
      await examPlanApi.deleteSubject(id)
      onReload()
    }
  }

  const handleDeleteTopic = async (topicId) => {
    await topicApi.delete(topicId)
    onReload()
  }

  const handleRenameTopic = async (topicId, newTitle) => {
    await topicApi.update(topicId, { title: newTitle })
    onReload()
  }

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: 'var(--bg-card)',
        border: editMode ? '1px solid rgba(139,92,246,0.3)' : '1px solid var(--bdr-md)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors"
        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        onClick={() => !editingName && setOpen(o => !o)}
      >
        <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: color }} />

        <div className="flex-1 min-w-0">
          {editMode && editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleNameKeyDown}
              onClick={e => e.stopPropagation()}
              className="font-semibold text-sm px-2 py-0.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-violet-500"
              style={{
                background: 'var(--bg-elev)',
                border: '1px solid var(--bdr-md)',
                color: 'var(--text)',
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{name}</p>
              {editMode && (
                <button
                  onClick={e => { e.stopPropagation(); setEditingName(true) }}
                  title="Renomear disciplina"
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-violet-500/20 transition-colors opacity-60 hover:opacity-100"
                  style={{ color: 'var(--text-3)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}
            </div>
          )}
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-mut)' }}>
            {topics.length} tópico{topics.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Color picker — edit mode only */}
        {editMode && (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                title={c}
                className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-125"
                style={{
                  background: c,
                  borderColor: c === color ? 'white' : 'transparent',
                }}
              />
            ))}
          </div>
        )}

        {/* Stats — hidden in edit mode */}
        {!editMode && (
          <>
            <div className="flex items-center gap-3 text-xs rounded-lg px-3 py-1.5" style={{ border: '1px solid var(--bdr-md)' }}>
              <span style={{ color: 'var(--text-3)' }} title="Total">{totalTopics}</span>
              <span style={{ color: 'var(--bdr-str)' }}>|</span>
              <span className="text-yellow-400" title="Estudados">{studied}</span>
              <span style={{ color: 'var(--bdr-str)' }}>|</span>
              <span className="text-green-400" title="Dominados">{mastered}</span>
            </div>

            <div className="w-28 hidden sm:block">
              <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bg-elev)' }}>
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%`, background: color }} />
              </div>
              <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-mut)' }}>{progressPercent}%</p>
            </div>
          </>
        )}

        {/* Delete button — edit mode only */}
        {editMode && (
          <button
            onClick={e => { e.stopPropagation(); handleDeleteSubject() }}
            title="Remover disciplina"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/20 transition-colors"
            style={{ color: 'var(--text-mut)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        )}

        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-mut)', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="py-2" style={{ borderTop: '1px solid var(--bdr)' }}>
          {topics.length === 0
            ? <p className="text-sm text-center py-4" style={{ color: 'var(--text-mut)' }}>Nenhum tópico</p>
            : topics.map(t => (
                <TopicRow
                  key={t.id}
                  topic={t}
                  onStatusChange={onTopicStatusChange}
                  editMode={editMode}
                  onDelete={handleDeleteTopic}
                  onRename={handleRenameTopic}
                />
              ))
          }
          {editMode && (
            <NewTopicInput subjectId={id} onCreated={onReload} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── NewSubjectInput ──────────────────────────────────────────────────────────

function NewSubjectInput({ planId, onCreated }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && value.trim()) {
      setSaving(true)
      try {
        await examPlanApi.createSubject(planId, {
          name: value.trim(),
          color: '#7c3aed',
          priority: 3,
          weeklyHours: 4,
        })
        setValue('')
        onCreated()
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <div
      className="rounded-xl px-5 py-3 flex items-center gap-3"
      style={{ background: 'var(--bg-card)', border: '1px dashed var(--bdr-md)' }}
    >
      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: '#7c3aed' }} />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        placeholder="Nova disciplina... (Enter para adicionar)"
        className="flex-1 text-sm bg-transparent focus:outline-none disabled:opacity-50"
        style={{ color: 'var(--text-2)' }}
      />
      <span className="text-xs" style={{ color: 'var(--text-mut)' }}>Enter ↵</span>
    </div>
  )
}

// ─── CreateCustomPlanModal ────────────────────────────────────────────────────

function CreateCustomPlanInline({ onCreate }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleCreate = async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onCreate(trimmed)
      setValue('')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') { setValue(''); setOpen(false) }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed text-sm transition-colors hover:border-violet-500 hover:text-violet-400"
        style={{ borderColor: 'var(--bdr-md)', color: 'var(--text-mut)' }}
      >
        + Criar edital personalizado
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        placeholder="Nome do edital..."
        className="px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--bdr-md)',
          color: 'var(--text)',
        }}
      />
      <button
        onClick={handleCreate}
        disabled={saving || !value.trim()}
        className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
      >
        {saving ? '...' : 'Criar'}
      </button>
      <button
        onClick={() => { setValue(''); setOpen(false) }}
        className="px-3 py-2 rounded-lg text-sm transition-colors"
        style={{ color: 'var(--text-mut)', border: '1px solid var(--bdr-md)' }}
      >
        Cancelar
      </button>
    </div>
  )
}

// ─── CreateFromScratch ────────────────────────────────────────────────────────

function CreateFromScratch({ onCreate, onCancel }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleCreate = async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onCreate(trimmed)
      setValue('')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') { setValue(''); onCancel() }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={saving}
        placeholder="Nome do edital..."
        className="px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}
      />
      <button
        onClick={handleCreate}
        disabled={saving || !value.trim()}
        className="px-3 py-2 rounded-lg text-sm bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
      >
        {saving ? '...' : 'Criar'}
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-2 rounded-lg text-sm transition-colors"
        style={{ color: 'var(--text-mut)', border: '1px solid var(--bdr-md)' }}
      >
        Cancelar
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Topics() {
  const toast = useToast()
  const [available, setAvailable] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [progress, setProgress] = useState(null)
  const [importing, setImporting] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [editMode, setEditMode] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [showCreateInline, setShowCreateInline] = useState(false)

  useEffect(() => {
    loadAvailable()
  }, [])

  const loadAvailable = async () => {
    try {
      const list = await examPlanApi.listAvailable()
      setAvailable(list)
      const imported = list.find(p => p.imported)
      if (imported) loadPlan(imported)
    } catch {
      toast.error('Erro ao carregar editais disponíveis.')
    }
  }

  const loadPlan = async (plan) => {
    if (!plan.id) return
    setLoading(true)
    setSelectedPlan(plan)
    try {
      const [subs, prog] = await Promise.all([
        examPlanApi.getSubjects(plan.id),
        examPlanApi.getProgress(plan.id),
      ])
      setSubjects(subs)
      setProgress(prog)
    } catch {
      toast.error('Erro ao carregar dados do edital.')
    } finally {
      setLoading(false)
    }
  }

  const reload = () => {
    if (selectedPlan) loadPlan(selectedPlan)
  }

  const handleImport = async (plan) => {
    setImporting(plan.slug)
    try {
      await examPlanApi.import(plan.slug)
      const list = await examPlanApi.listAvailable()
      setAvailable(list)
      const imported = list.find(p => p.slug === plan.slug)
      if (imported) await loadPlan(imported)
      toast.success('Edital importado com sucesso!')
    } catch {
      toast.error('Erro ao importar edital. Tente novamente.')
    } finally {
      setImporting(null)
    }
  }

  const handleSync = async (plan) => {
    setSyncing(plan.slug)
    try {
      await examPlanApi.import(plan.slug)
      await loadPlan(plan)
      toast.success('Edital sincronizado!')
    } catch {
      toast.error('Erro ao sincronizar edital.')
    } finally {
      setSyncing(null)
    }
  }

  const handleCreateCustom = async (name) => {
    try {
      const newPlan = await examPlanApi.createCustom(name)
      const list = await examPlanApi.listAvailable()
      setAvailable([...list, { ...newPlan, imported: true, custom: true }])
      await loadPlan(newPlan)
      setEditMode(true)
    } catch {
      toast.error('Erro ao criar edital personalizado.')
    }
  }

  const handleBulkImported = async (newPlan) => {
    const list = await examPlanApi.listAvailable()
    // The new plan may or may not appear yet (depends on whether subjects were created)
    const inList = list.find(p => p.id === newPlan.id)
    setAvailable(inList ? list : [...list, { ...newPlan, imported: true, custom: true }])
    await loadPlan(newPlan)
    setEditMode(false)
  }

  const handleTopicStatusChange = async (topicId, newStatus) => {
    const snapshot = subjects
    setSubjects(prev => prev.map(s => {
      const updatedTopics = s.topics.map(t => t.id === topicId ? { ...t, status: newStatus } : t)
      const newStudied = updatedTopics.filter(t => t.status === 'STUDIED').length
      const newMastered = updatedTopics.filter(t => t.status === 'MASTERED').length
      const newCompleted = newStudied + newMastered
      return {
        ...s,
        topics: updatedTopics,
        studied: newStudied,
        mastered: newMastered,
        completedTopics: newCompleted,
        progressPercent: s.totalTopics > 0 ? Math.round((newCompleted / s.totalTopics) * 1000) / 10 : 0,
      }
    }))
    try {
      await topicApi.update(topicId, { status: newStatus })
      if (selectedPlan?.id) examPlanApi.getProgress(selectedPlan.id).then(setProgress).catch(() => {})
    } catch {
      setSubjects(snapshot)
      toast.error('Erro ao atualizar tópico.')
    }
  }

  const isFiltering = !editMode && (search.trim() || filterStatus !== 'ALL')

  const filteredSubjects = subjects.map(s => ({
    ...s,
    topics: s.topics.filter(t => {
      const matchesSearch = !search.trim() || t.title.toLowerCase().includes(search.trim().toLowerCase())
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus
      return matchesSearch && matchesStatus
    }),
  })).filter(s => s.topics.length > 0)

  const displaySubjects = isFiltering ? filteredSubjects : subjects
  const totalFiltered = filteredSubjects.reduce((acc, s) => acc + s.topics.length, 0)

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Edital Verticalizado</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Acompanhe cada tópico do seu concurso</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {available.map(plan => (
            plan.imported ? (
              <div key={plan.slug ?? plan.id} className="flex items-center gap-1">
                <button
                  onClick={() => { loadPlan(plan); setEditMode(false) }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedPlan?.id === plan.id
                      ? 'bg-violet-600/20 border-violet-500 text-violet-400'
                      : ''
                  }`}
                  style={selectedPlan?.id !== plan.id ? { border: '1px solid var(--bdr-md)', color: 'var(--text-3)' } : undefined}
                >
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  {plan.name}
                </button>
                {/* Sync button — only for non-custom plans */}
                {!plan.custom && (
                  <button
                    onClick={() => handleSync(plan)}
                    disabled={syncing === plan.slug}
                    title="Sincronizar tópicos com o JSON"
                    className="px-2 py-2 rounded-lg text-xs transition-colors disabled:opacity-40"
                    style={{ border: '1px solid var(--bdr-md)', color: 'var(--text-mut)' }}
                  >
                    {syncing === plan.slug ? '...' : '↻'}
                  </button>
                )}
              </div>
            ) : (
              <button
                key={plan.slug}
                onClick={() => handleImport(plan)}
                disabled={importing === plan.slug}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed hover:border-violet-500 hover:text-violet-400 text-sm transition-colors disabled:opacity-50"
                style={{ borderColor: 'var(--bdr-md)', color: 'var(--text-mut)' }}
              >
                {importing === plan.slug ? 'Importando...' : `+ Importar ${plan.name}`}
              </button>
            )
          ))}

          {/* Import edital primary button */}
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
          >
            + Importar edital
          </button>

          {/* "Criar do zero" secondary option */}
          {!showCreateInline ? (
            <button
              onClick={() => setShowCreateInline(true)}
              className="text-sm transition-colors hover:text-violet-400"
              style={{ color: 'var(--text-mut)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px' }}
            >
              Criar do zero
            </button>
          ) : (
            <CreateFromScratch
              onCreate={async (name) => {
                await handleCreateCustom(name)
                setShowCreateInline(false)
              }}
              onCancel={() => setShowCreateInline(false)}
            />
          )}

          {/* Edit mode toggle */}
          {selectedPlan && (
            editMode ? (
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M20 6L9 17l-5-5"/></svg> Concluído
              </button>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ border: '1px solid var(--bdr-md)', color: 'var(--text-3)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar edital
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Edit mode banner ── */}
      {editMode && (
        <div
          className="rounded-xl px-5 py-3 flex items-center gap-3 text-sm"
          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--text-2)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0 text-violet-400"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <span>Modo de edição ativo — renomeie disciplinas e tópicos, altere cores, adicione ou remova itens.</span>
          <button
            onClick={() => setEditMode(false)}
            className="ml-auto text-xs text-violet-400 hover:text-violet-300"
          >
            Sair da edição
          </button>
        </div>
      )}

      {/* ── Progress card ── */}
      {selectedPlan && progress && !editMode && (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-md)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Progresso no edital</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
                {progress.completedTopics} de {progress.totalTopics} tópicos concluídos
              </p>
            </div>
            <span className="text-2xl font-bold text-violet-400">{progress.progressPercent}%</span>
          </div>
          <div className="w-full rounded-full h-2.5" style={{ background: 'var(--bg-elev)' }}>
            <div
              className="bg-violet-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <div className="flex gap-5 mt-3 text-xs" style={{ color: 'var(--text-mut)' }}>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--bg-elev)' }} />Não estudado</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" />Estudado</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" />Dominado</span>
          </div>
        </div>
      )}

      {/* ── Search and filter (hidden in edit mode) ── */}
      {subjects.length > 0 && !editMode && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tópico..."
              className="w-full rounded-lg pl-3 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-md)', color: 'var(--text-2)' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 flex items-center justify-center"
                style={{ color: 'var(--text-mut)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === f.key
                    ? 'bg-violet-600/20 border-violet-500 text-violet-400'
                    : ''
                }`}
                style={filterStatus !== f.key ? { border: '1px solid var(--bdr-md)', color: 'var(--text-3)' } : undefined}
              >
                {f.label}
                {f.key !== 'ALL' && (
                  <span className="ml-1.5 opacity-60">
                    {subjects.reduce((acc, s) => acc + s.topics.filter(t => t.status === f.key).length, 0)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!selectedPlan && !loading && (
        <div className="text-center py-20">
          <p className="font-semibold" style={{ color: 'var(--text-3)' }}>Nenhum edital carregado</p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-mut)' }}>
            Clique em "+ Importar" acima para carregar os tópicos do seu concurso,
            ou crie um edital personalizado.
          </p>
        </div>
      )}

      {loading && <p className="animate-pulse text-center py-12" style={{ color: 'var(--text-3)' }}>Carregando tópicos...</p>}

      {/* ── Subjects list ── */}
      {!loading && displaySubjects.length > 0 && (
        <div className="space-y-3">
          {isFiltering && (
            <p className="text-xs" style={{ color: 'var(--text-mut)' }}>
              {totalFiltered} tópico{totalFiltered !== 1 ? 's' : ''} encontrado{totalFiltered !== 1 ? 's' : ''}
              {' '}em {filteredSubjects.length} disciplina{filteredSubjects.length !== 1 ? 's' : ''}
            </p>
          )}
          {displaySubjects.map(s => (
            <SubjectAccordion
              key={s.id}
              subjectData={s}
              onTopicStatusChange={handleTopicStatusChange}
              forceOpen={isFiltering || editMode}
              editMode={editMode}
              onReload={reload}
            />
          ))}
          {/* New subject row — edit mode only */}
          {editMode && (
            <NewSubjectInput planId={selectedPlan.id} onCreated={reload} />
          )}
        </div>
      )}

      {/* New subject row when list is empty and in edit mode */}
      {!loading && displaySubjects.length === 0 && editMode && selectedPlan && (
        <div className="space-y-3">
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-mut)' }}>
            Nenhuma disciplina ainda. Adicione abaixo.
          </p>
          <NewSubjectInput planId={selectedPlan.id} onCreated={reload} />
        </div>
      )}

      {/* ── No results from filter ── */}
      {!loading && isFiltering && filteredSubjects.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-mut)' }}>
          <p className="text-sm">Nenhum tópico encontrado para "<span style={{ color: 'var(--text-3)' }}>{search}</span>"</p>
          <button onClick={() => { setSearch(''); setFilterStatus('ALL') }} className="text-xs text-violet-400 hover:text-violet-300 mt-2">
            Limpar filtros
          </button>
        </div>
      )}

      {/* ── Edital import modal ── */}
      <EditalImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={handleBulkImported}
      />
    </div>
  )
}
