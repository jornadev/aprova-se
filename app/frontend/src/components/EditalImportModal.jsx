import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { examPlanApi } from '../services/api'
import { useToast } from '../context/ToastContext'

const PALETTE = ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316']

function parseTopics(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

// ─── Overlay shell ────────────────────────────────────────────────────────────

function ModalShell({ onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(2,6,23,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--bdr-md)',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

// ─── Color picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '5px' }}>
      {PALETTE.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            width: 16, height: 16, borderRadius: '50%', background: c,
            border: c === value ? '2px solid white' : '2px solid transparent',
            cursor: 'pointer', padding: 0, flexShrink: 0,
            transition: 'transform 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        />
      ))}
    </div>
  )
}

// ─── Discipline card ──────────────────────────────────────────────────────────

function DisciplineCard({ disc, index, onChange, onDelete }) {
  const topics = parseTopics(disc.text)
  const nameRef = useRef(null)

  useEffect(() => {
    if (disc._focusName) {
      nameRef.current?.focus()
      onChange(index, { ...disc, _focusName: false })
    }
  }, [disc._focusName])

  return (
    <div style={{
      borderRadius: '0.75rem',
      border: '1px solid var(--bdr-md)',
      overflow: 'hidden',
      marginBottom: '0.75rem',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px',
        borderBottom: '1px solid var(--bdr)',
        background: 'var(--bg-elev)',
      }}>
        <div style={{ width: 4, height: 32, borderRadius: 2, background: disc.color, flexShrink: 0 }} />

        <input
          ref={nameRef}
          value={disc.name}
          onChange={e => onChange(index, { ...disc, name: e.target.value })}
          placeholder="Nome da disciplina"
          style={{
            flex: 1, fontSize: '0.875rem', fontWeight: 600,
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--text)',
          }}
        />

        <ColorPicker value={disc.color} onChange={c => onChange(index, { ...disc, color: c })} />

        {topics.length > 0 && (
          <span style={{
            fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
            borderRadius: 99, background: 'rgba(124,58,237,0.15)',
            color: '#a78bfa', flexShrink: 0,
          }}>
            {topics.length} tópico{topics.length !== 1 ? 's' : ''}
          </span>
        )}

        <button
          onClick={() => onDelete(index)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mut)', padding: '4px', fontSize: '0.85rem' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mut)'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>

      {/* Topics textarea */}
      <div style={{ padding: '12px 14px 10px', background: 'var(--bg-card)' }}>
        <textarea
          value={disc.text}
          onChange={e => onChange(index, { ...disc, text: e.target.value })}
          placeholder={'Cole os tópicos aqui, um por linha:\n\nLei nº 11.340/2006 – Lei Maria da Penha\nLei nº 12.288/2010 – Estatuto da Igualdade Racial\nConstituição Federal – Arts. 1º ao 4º\n...'}
          style={{
            width: '100%', minHeight: 120, resize: 'vertical',
            fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6,
            background: 'var(--bg-input)', border: '1px solid var(--bdr)',
            borderRadius: '0.5rem', padding: '10px 12px',
            color: 'var(--text-2)', outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = '#7c3aed'}
          onBlur={e => e.target.style.borderColor = 'var(--bdr)'}
        />
        <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'var(--text-mut)' }}>
          Cada linha vira um tópico
        </p>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function EditalImportModal({ open, onClose, onImported }) {
  const toast = useToast()
  const [planName, setPlanName] = useState('')
  const [discs, setDiscs] = useState([{ name: '', color: PALETTE[0], text: '', _focusName: true }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPlanName('')
      setDiscs([{ name: '', color: PALETTE[0], text: '', _focusName: true }])
      setSaving(false)
    }
  }, [open])

  if (!open) return null

  const addDisc = () => {
    setDiscs(prev => [...prev, {
      name: '',
      color: PALETTE[prev.length % PALETTE.length],
      text: '',
      _focusName: true,
    }])
  }

  const updateDisc = (i, updated) => setDiscs(prev => prev.map((d, idx) => idx === i ? updated : d))
  const deleteDisc = (i) => setDiscs(prev => prev.filter((_, idx) => idx !== i))

  const totalTopics = discs.reduce((acc, d) => acc + parseTopics(d.text).length, 0)
  const filledDiscs = discs.filter(d => d.name.trim())
  const canCreate = filledDiscs.some(d => parseTopics(d.text).length > 0)

  const handleCreate = async () => {
    if (!canCreate) return
    setSaving(true)
    try {
      const payload = {
        name: planName.trim() || 'Edital personalizado',
        subjects: filledDiscs.map(d => ({
          name: d.name.trim(),
          color: d.color,
          topics: parseTopics(d.text),
        })),
      }
      const result = await examPlanApi.bulkImport(payload)
      onImported(result)
      onClose()
      toast.success('Edital criado com sucesso!')
    } catch {
      toast.error('Erro ao criar edital. Verifique os dados e tente novamente.')
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div style={{
        padding: '18px 22px 14px',
        borderBottom: '1px solid var(--bdr)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Criar edital
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', margin: '2px 0 10px' }}>
            Adicione as disciplinas e cole os tópicos de cada uma
          </p>
          <input
            type="text"
            value={planName}
            onChange={e => setPlanName(e.target.value)}
            placeholder="Nome do edital (ex: Policial Penal RS 2026)"
            style={{
              width: '100%', padding: '8px 12px', fontSize: '0.875rem',
              background: 'var(--bg-input)', border: '1px solid var(--bdr-md)',
              borderRadius: '0.5rem', color: 'var(--text)', outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = '#7c3aed'}
            onBlur={e => e.target.style.borderColor = 'var(--bdr-md)'}
          />
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-mut)', fontSize: '1.2rem', padding: '4px', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mut)'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Discipline list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
        {discs.map((d, i) => (
          <DisciplineCard
            key={i}
            index={i}
            disc={d}
            onChange={updateDisc}
            onDelete={deleteDisc}
          />
        ))}

        <button
          onClick={addDisc}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '10px 14px',
            borderRadius: '0.75rem', border: '1px dashed var(--bdr-md)',
            background: 'none', color: 'var(--text-mut)', cursor: 'pointer',
            fontSize: '0.875rem',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bdr-md)'; e.currentTarget.style.color = 'var(--text-mut)' }}
        >
          + Adicionar disciplina
        </button>
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 22px',
        borderTop: '1px solid var(--bdr)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-mut)' }}>
          {filledDiscs.length} disciplina{filledDiscs.length !== 1 ? 's' : ''} · {totalTopics} tópico{totalTopics !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '0.5rem', fontSize: '0.875rem',
              background: 'none', border: '1px solid var(--bdr-md)', color: 'var(--text-3)', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !canCreate}
            style={{
              padding: '8px 20px', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600,
              background: canCreate && !saving ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--bg-elev)',
              color: canCreate && !saving ? 'white' : 'var(--text-mut)',
              border: 'none', cursor: canCreate && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Criando...' : 'Criar edital'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
