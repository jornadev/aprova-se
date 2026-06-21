import { useState, useEffect, useRef } from 'react'
import { examPlanApi, topicApi, noteApi } from '../services/api'
import EditalImportModal from '../components/EditalImportModal'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
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

function TopicRow({ topic, onStatusChange, editMode, onDelete, onRename, onOpenNotes }) {
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

      {/* Notes + Status label on hover (non-edit) */}
      {!editMode && (
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onOpenNotes(topic)} title="Anotações"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-violet-500/15 transition-colors"
            style={{ color: 'var(--text-mut)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <span className="text-xs" style={{ color: STATUS_COLOR[topic.status] }}>
            {STATUS_LABEL[topic.status]}
          </span>
        </div>
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

function SubjectAccordion({ subjectData, onTopicStatusChange, forceOpen, editMode, onReload, onOpenNotes }) {
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
                  onOpenNotes={onOpenNotes}
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

function ImportTutorial() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bdr-md)' }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors text-left"
        style={{ background: 'var(--row-bg)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elev)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--row-bg)'}>
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0" style={{ color: '#a78bfa' }}>
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Como importar um edital?</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-mut)' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="px-5 py-4 space-y-4" style={{ background: 'var(--row-bg)', borderTop: '1px solid var(--bdr)' }}>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#7c3aed' }}>1</div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Acesse o edital do seu concurso</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-mut)' }}>
                Abra o PDF do edital no site da banca organizadora (CESPE, FCC, VUNESP, etc.) ou em sites como PCI Concursos, JC Concursos.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#7c3aed' }}>2</div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Encontre o "Conteúdo Programático"</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-mut)' }}>
                No edital, procure a seção chamada "Conteúdo Programático", "Conhecimentos Básicos" ou "Conhecimentos Específicos". Geralmente fica no anexo do edital.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#7c3aed' }}>3</div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Copie todo o texto</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-mut)' }}>
                Selecione todo o conteúdo programático (Ctrl+A no trecho ou selecione com o mouse) e copie (Ctrl+C). Inclua todas as disciplinas e seus tópicos.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: '#7c3aed' }}>4</div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Cole aqui e deixe a IA organizar</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-mut)' }}>
                Clique em <strong>"+ Criar edital"</strong>, selecione <strong>"Analisar com IA"</strong> e cole o texto copiado. Nossa inteligência artificial vai separar automaticamente as disciplinas e tópicos pra você.
              </p>
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              <strong style={{ color: '#a78bfa' }}>Dica:</strong> Não precisa formatar nada. Pode colar o texto cru do PDF — com numerações, quebras de linha, etc. A IA entende e organiza tudo automaticamente.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Topics() {
  const toast = useToast()
  const [available, setAvailable] = useState([])
  const [expandedPlanId, setExpandedPlanId] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [editMode, setEditMode] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [noteTopic, setNoteTopic] = useState(null)
  const [notes, setNotes] = useState([])
  const [noteForm, setNoteForm] = useState({ title: '', content: '' })
  const [noteSaving, setNoteSaving] = useState(false)

  const handleOpenNotes = async (topic) => {
    setNoteTopic(topic)
    setNoteForm({ title: '', content: '' })
    try {
      const n = await noteApi.getAll({ topicId: topic.id })
      setNotes(n || [])
    } catch { setNotes([]) }
  }

  const handleSaveNote = async () => {
    if (!noteForm.title.trim()) return
    setNoteSaving(true)
    try {
      await noteApi.create({
        topic: { id: noteTopic.id },
        subject: noteTopic.subject || { id: noteTopic.subject?.id },
        title: noteForm.title,
        content: noteForm.content,
      })
      setNoteForm({ title: '', content: '' })
      const n = await noteApi.getAll({ topicId: noteTopic.id })
      setNotes(n || [])
      toast.success('Anotação salva!')
    } catch { toast.error('Erro ao salvar anotação.') }
    finally { setNoteSaving(false) }
  }

  const handleDeleteNote = async (id) => {
    try {
      await noteApi.delete(id)
      setNotes(notes.filter(n => n.id !== id))
    } catch { toast.error('Erro ao excluir anotação.') }
  }

  useEffect(() => { loadAvailable() }, [])

  const loadAvailable = async () => {
    try {
      const list = await examPlanApi.listAvailable()
      setAvailable(list.filter(p => p.imported))
    } catch {
      toast.error('Erro ao carregar editais.')
    }
  }

  const togglePlan = async (plan) => {
    if (expandedPlanId === plan.id) {
      setExpandedPlanId(null)
      setSubjects([])
      setProgress(null)
      setEditMode(false)
      return
    }
    if (!plan.id) return
    setLoading(true)
    setExpandedPlanId(plan.id)
    setEditMode(false)
    setSearch('')
    setFilterStatus('ALL')
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
    const plan = available.find(p => p.id === expandedPlanId)
    if (plan) togglePlan(plan).then(() => togglePlan(plan))
  }

  const reloadPlan = async () => {
    const plan = available.find(p => p.id === expandedPlanId)
    if (!plan) return
    try {
      const [subs, prog] = await Promise.all([
        examPlanApi.getSubjects(plan.id),
        examPlanApi.getProgress(plan.id),
      ])
      setSubjects(subs)
      setProgress(prog)
    } catch {}
  }

  const handleDeletePlan = async (plan) => {
    if (!confirm(`Apagar o edital "${plan.name}" e todas as suas disciplinas e tópicos? Essa ação não pode ser desfeita.`)) return
    try {
      await examPlanApi.deletePlan(plan.id)
      if (expandedPlanId === plan.id) {
        setExpandedPlanId(null)
        setSubjects([])
        setProgress(null)
        setEditMode(false)
      }
      await loadAvailable()
      toast.success('Edital apagado com sucesso!')
    } catch {
      toast.error('Erro ao apagar edital.')
    }
  }

  const handleBulkImported = async (newPlan) => {
    await loadAvailable()
    setExpandedPlanId(newPlan.id)
    try {
      const [subs, prog] = await Promise.all([
        examPlanApi.getSubjects(newPlan.id),
        examPlanApi.getProgress(newPlan.id),
      ])
      setSubjects(subs)
      setProgress(prog)
    } catch {}
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
      if (expandedPlanId) examPlanApi.getProgress(expandedPlanId).then(setProgress).catch(() => {})
    } catch {
      setSubjects(snapshot)
      toast.error('Erro ao atualizar tópico.')
    }
  }

  const selectedPlan = available.find(p => p.id === expandedPlanId) || null
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
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
        >
          + Criar edital
        </button>
      </div>

      {/* ── Tutorial ── */}
      <ImportTutorial />

      {/* ── Plan list ── */}
      {available.length === 0 && (
        <div className="text-center py-16">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-ghost)' }}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
          <p className="font-semibold" style={{ color: 'var(--text-3)' }}>Nenhum edital cadastrado</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-mut)' }}>
            Clique em "+ Criar edital" e siga o tutorial acima para importar o conteúdo do seu concurso.
          </p>
        </div>
      )}

      {available.map(plan => (
        <div key={plan.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: expandedPlanId === plan.id ? '1px solid rgba(124,58,237,0.3)' : '1px solid var(--bdr-md)' }}>
          {/* Plan header */}
          <div
            className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--row-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => togglePlan(plan)}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{plan.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-mut)' }}>
                {plan.organization && plan.organization !== '' ? plan.organization : 'Edital personalizado'}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); handleDeletePlan(plan) }}
              title="Apagar edital"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-mut)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mut)'; e.currentTarget.style.background = 'transparent' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 transition-transform flex-shrink-0 ${expandedPlanId === plan.id ? 'rotate-180' : ''}`} style={{ color: 'var(--text-mut)' }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          {/* Expanded content */}
          {expandedPlanId === plan.id && (
            <div style={{ borderTop: '1px solid var(--bdr)' }}>
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 px-5 py-3 flex-wrap" style={{ background: 'var(--row-bg)' }}>
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <button onClick={() => setEditMode(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M20 6L9 17l-5-5"/></svg> Concluído
                    </button>
                  ) : (
                    <button onClick={() => setEditMode(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ border: '1px solid var(--bdr-md)', color: 'var(--text-3)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar
                    </button>
                  )}
                </div>
                {progress && !editMode && (
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-mut)' }}>
                    <span>{progress.completedTopics}/{progress.totalTopics} tópicos</span>
                    <div className="w-24 h-1.5 rounded-full" style={{ background: 'var(--bg-elev)' }}>
                      <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${progress.progressPercent}%` }} />
                    </div>
                    <span className="font-bold text-violet-400">{progress.progressPercent}%</span>
                  </div>
                )}
              </div>

              {/* Search and filter */}
              {subjects.length > 0 && !editMode && (
                <div className="flex flex-col sm:flex-row gap-3 px-5 py-3">
                  <div className="relative flex-1">
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tópico..."
                      className="w-full rounded-lg pl-3 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr)', color: 'var(--text-2)' }} />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-mut)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {FILTERS.map(f => (
                      <button key={f.key} onClick={() => setFilterStatus(f.key)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterStatus === f.key ? 'bg-violet-600/20 border-violet-500 text-violet-400' : ''}`}
                        style={filterStatus !== f.key ? { border: '1px solid var(--bdr)', color: 'var(--text-3)' } : undefined}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading */}
              {loading && <p className="animate-pulse text-center py-8 text-sm" style={{ color: 'var(--text-3)' }}>Carregando...</p>}

              {/* Subjects */}
              {!loading && (
                <div className="space-y-3 px-5 pb-5 pt-2">
                  {isFiltering && filteredSubjects.length > 0 && (
                    <p className="text-xs" style={{ color: 'var(--text-mut)' }}>{totalFiltered} tópico{totalFiltered !== 1 ? 's' : ''} encontrado{totalFiltered !== 1 ? 's' : ''}</p>
                  )}
                  {displaySubjects.map(s => (
                    <SubjectAccordion key={s.id} subjectData={s} onTopicStatusChange={handleTopicStatusChange} forceOpen={isFiltering || editMode} editMode={editMode} onReload={reloadPlan} onOpenNotes={handleOpenNotes} />
                  ))}
                  {editMode && <NewSubjectInput planId={expandedPlanId} onCreated={reloadPlan} />}
                  {displaySubjects.length === 0 && !editMode && !isFiltering && (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--text-mut)' }}>Nenhuma disciplina cadastrada.</p>
                  )}
                  {displaySubjects.length === 0 && editMode && (
                    <>
                      <p className="text-sm text-center py-2" style={{ color: 'var(--text-mut)' }}>Nenhuma disciplina. Adicione abaixo.</p>
                      <NewSubjectInput planId={expandedPlanId} onCreated={reloadPlan} />
                    </>
                  )}
                  {isFiltering && filteredSubjects.length === 0 && (
                    <div className="text-center py-8" style={{ color: 'var(--text-mut)' }}>
                      <p className="text-sm">Nenhum tópico encontrado</p>
                      <button onClick={() => { setSearch(''); setFilterStatus('ALL') }} className="text-xs text-violet-400 hover:text-violet-300 mt-2">Limpar filtros</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <EditalImportModal open={importModalOpen} onClose={() => setImportModalOpen(false)} onImported={handleBulkImported} />

      {/* Notes Modal */}
      <Modal open={!!noteTopic} onClose={() => setNoteTopic(null)} title={`Anotações — ${noteTopic?.title || ''}`}>
        <div className="space-y-4">
          {notes.map(n => (
            <div key={n.id} className="rounded-xl p-3 group" style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr)' }}>
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{n.title}</p>
                <button onClick={() => handleDeleteNote(n.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-mut)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {n.content && <p className="text-xs mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-3)' }}>{n.content}</p>}
              <p className="text-[10px] mt-2" style={{ color: 'var(--text-ghost)' }}>
                {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}

          {notes.length === 0 && (
            <p className="text-center text-xs py-4" style={{ color: 'var(--text-mut)' }}>Nenhuma anotação para este tópico.</p>
          )}

          <div style={{ borderTop: '1px solid var(--bdr)' }} className="pt-3 space-y-2">
            <input value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Título da anotação..."
              className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-colors"
              style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }} />
            <textarea value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Escreva sua anotação..." rows={3}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm resize-none transition-colors"
              style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }} />
            <Button onClick={handleSaveNote} disabled={!noteForm.title.trim() || noteSaving} className="w-full">
              {noteSaving ? 'Salvando...' : 'Salvar anotação'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
