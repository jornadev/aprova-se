import { useState, useEffect, useCallback } from 'react'
import { questionApi, subjectApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'

function Loader() {
  return (
    <div className="flex items-center gap-1.5 py-20 justify-center">
      {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>)}
    </div>
  )
}

function PracticeMode({ questions, onFinish }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })

  const q = questions[current]
  const alternatives = (() => { try { return JSON.parse(q.alternatives) } catch { return [] } })()
  const isLast = current === questions.length - 1

  const handleSelect = (idx) => {
    if (revealed) return
    setSelected(idx)
  }

  const handleReveal = () => {
    if (selected === null) return
    setRevealed(true)
    if (selected === q.correctIndex) {
      setScore(s => ({ ...s, correct: s.correct + 1 }))
    } else {
      setScore(s => ({ ...s, wrong: s.wrong + 1 }))
    }
  }

  const handleNext = () => {
    if (isLast) {
      onFinish(score.correct + (selected === q.correctIndex ? 0 : 0), score.wrong)
      return
    }
    setCurrent(c => c + 1)
    setSelected(null)
    setRevealed(false)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text-fad)' }}>
          Questão {current + 1} de {questions.length}
        </span>
        <div className="flex items-center gap-3 text-sm">
          <span style={{ color: '#22c55e' }}>{score.correct + (revealed && selected === q.correctIndex ? 1 : 0)} acertos</span>
          <span style={{ color: '#ef4444' }}>{score.wrong + (revealed && selected !== q.correctIndex ? 1 : 0)} erros</span>
        </div>
      </div>

      <div className="h-1 rounded-full" style={{ background: 'var(--bdr)' }}>
        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
        <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>{q.questionText}</p>
      </div>

      <div className="space-y-2">
        {alternatives.map((alt, idx) => {
          const letter = String.fromCharCode(65 + idx)
          let bg = 'var(--row-bg)'
          let border = 'var(--bdr)'
          let textColor = 'var(--text-2)'

          if (revealed) {
            if (idx === q.correctIndex) {
              bg = 'rgba(34,197,94,0.1)'; border = 'rgba(34,197,94,0.3)'; textColor = '#22c55e'
            } else if (idx === selected) {
              bg = 'rgba(239,68,68,0.1)'; border = 'rgba(239,68,68,0.3)'; textColor = '#ef4444'
            }
          } else if (idx === selected) {
            bg = 'rgba(124,58,237,0.1)'; border = 'rgba(124,58,237,0.3)'; textColor = '#a78bfa'
          }

          return (
            <button key={idx} onClick={() => handleSelect(idx)}
              className="w-full text-left flex items-start gap-3 rounded-xl px-4 py-3 transition-all"
              style={{ background: bg, border: `1px solid ${border}` }}
              disabled={revealed}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: idx === selected ? (revealed ? (idx === q.correctIndex ? '#22c55e' : '#ef4444') : '#7c3aed') : 'var(--bg-elev)', color: idx === selected ? '#fff' : 'var(--text-3)' }}>
                {letter}
              </span>
              <span className="text-sm" style={{ color: textColor }}>{alt}</span>
            </button>
          )
        })}
      </div>

      {revealed && q.explanation && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#a78bfa' }}>Explicação</p>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{q.explanation}</p>
        </div>
      )}

      <div className="flex gap-3">
        {!revealed ? (
          <Button onClick={handleReveal} disabled={selected === null} className="flex-1">Confirmar</Button>
        ) : (
          <Button onClick={handleNext} className="flex-1">{isLast ? 'Ver resultado' : 'Próxima'}</Button>
        )}
      </div>
    </div>
  )
}

function CreateQuestionModal({ open, subjects, onSave, onClose }) {
  const [form, setForm] = useState({ subjectId: '', questionText: '', alternatives: ['', '', '', '', ''], correctIndex: 0, explanation: '' })

  useEffect(() => {
    if (open) setForm({ subjectId: '', questionText: '', alternatives: ['', '', '', '', ''], correctIndex: 0, explanation: '' })
  }, [open])

  if (!open) return null

  const updateAlt = (idx, val) => {
    const alts = [...form.alternatives]
    alts[idx] = val
    setForm(f => ({ ...f, alternatives: alts }))
  }

  const valid = form.subjectId && form.questionText.trim() && form.alternatives.filter(a => a.trim()).length >= 2

  return (
    <Modal open={open} onClose={onClose} title="Nova Questão">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-3)' }}>Disciplina *</label>
          <select value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-colors"
            style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}>
            <option value="">Selecione...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-3)' }}>Enunciado *</label>
          <textarea value={form.questionText} onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
            rows={3} placeholder="Digite o enunciado da questão..."
            className="w-full rounded-xl px-3.5 py-2.5 text-sm resize-none transition-colors"
            style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }} />
        </div>

        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-3)' }}>Alternativas (mín. 2)</label>
          <div className="space-y-2">
            {form.alternatives.map((alt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button onClick={() => setForm(f => ({ ...f, correctIndex: idx }))}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                  style={form.correctIndex === idx
                    ? { background: '#22c55e', color: '#fff' }
                    : { background: 'var(--bg-elev)', color: 'var(--text-3)', border: '1px solid var(--bdr-md)' }}
                  title="Marcar como correta">
                  {String.fromCharCode(65 + idx)}
                </button>
                <input value={alt} onChange={e => updateAlt(idx, e.target.value)}
                  placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`}
                  className="flex-1 rounded-xl px-3.5 py-2.5 text-sm transition-colors"
                  style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }} />
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-mut)' }}>Clique na letra para marcar a alternativa correta</p>
        </div>

        <Input label="Explicação (opcional)" value={form.explanation}
          onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
          placeholder="Explique a resposta correta..." />

        <div className="flex gap-3 pt-1">
          <Button onClick={() => onSave({
            subject: { id: +form.subjectId },
            questionText: form.questionText,
            alternatives: JSON.stringify(form.alternatives.filter(a => a.trim())),
            correctIndex: form.correctIndex,
            explanation: form.explanation || null,
          })} disabled={!valid} className="flex-1">Salvar</Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function QuestionBank() {
  const toast = useToast()
  const [questions, setQuestions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [practiceMode, setPracticeMode] = useState(false)
  const [practiceQuestions, setPracticeQuestions] = useState([])
  const [result, setResult] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter ? { subjectId: filter } : {}
      const [q, s] = await Promise.all([questionApi.getAll(params), subjectApi.getAll()])
      setQuestions(q || [])
      setSubjects(s || [])
    } catch { toast.error('Erro ao carregar questões.') }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data) => {
    try {
      await questionApi.create(data)
      setCreateModal(false)
      load()
      toast.success('Questão cadastrada!')
    } catch { toast.error('Erro ao salvar questão.') }
  }

  const handleDelete = async (id) => {
    try {
      await questionApi.delete(id)
      load()
    } catch { toast.error('Erro ao excluir questão.') }
  }

  const startPractice = async () => {
    try {
      const params = filter ? { subjectId: filter, count: 10 } : { count: 10 }
      const q = await questionApi.practice(params)
      if (!q || q.length === 0) { toast.error('Nenhuma questão disponível para praticar.'); return }
      setPracticeQuestions(q)
      setPracticeMode(true)
      setResult(null)
    } catch { toast.error('Erro ao iniciar prática.') }
  }

  const finishPractice = (correct, wrong) => {
    setPracticeMode(false)
    setResult({ correct, wrong, total: practiceQuestions.length })
  }

  if (loading) return <Loader />

  if (practiceMode) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Modo Prática</h1>
          <Button variant="ghost" onClick={() => setPracticeMode(false)}>Sair</Button>
        </div>
        <PracticeMode questions={practiceQuestions} onFinish={finishPractice} />
      </div>
    )
  }

  const bySubject = {}
  questions.forEach(q => {
    const sid = q.subject?.id
    if (!bySubject[sid]) bySubject[sid] = { subject: q.subject, count: 0 }
    bySubject[sid].count++
  })

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Banco de Questões</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{questions.length} questões cadastradas</p>
        </div>
        <div className="flex items-center gap-2">
          {questions.length > 0 && (
            <Button variant="ghost" onClick={startPractice}>Praticar</Button>
          )}
          <Button onClick={() => setCreateModal(true)}>+ Nova Questão</Button>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#a78bfa' }}>Resultado da prática</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text)' }}>
                {Math.round((result.correct / result.total) * 100)}% de acerto
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{result.correct}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-mut)' }}>acertos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{result.wrong}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-mut)' }}>erros</p>
              </div>
            </div>
          </div>
          <button onClick={() => setResult(null)} className="text-xs mt-2" style={{ color: 'var(--text-mut)' }}>Fechar</button>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="rounded-xl px-3.5 py-2.5 text-sm transition-colors"
          style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}>
          <option value="">Todas as disciplinas</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-xs" style={{ color: 'var(--text-mut)' }}>
          {Object.keys(bySubject).length} disciplinas
        </span>
      </div>

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-ghost)' }}>
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>Nenhuma questão cadastrada</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-mut)' }}>Cadastre questões para praticar e acompanhar seu desempenho.</p>
          <Button onClick={() => setCreateModal(true)} className="mt-4">+ Cadastrar primeira questão</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map(q => {
            const sub = subjects.find(s => s.id === q.subject?.id)
            const alts = (() => { try { return JSON.parse(q.alternatives) } catch { return [] } })()
            return (
              <div key={q.id} className="rounded-xl px-5 py-4 group" style={{ background: 'var(--row-bg)', border: '1px solid var(--bdr)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-1" style={{ background: sub?.color || '#7c3aed' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${sub?.color || '#7c3aed'}15`, color: sub?.color || '#7c3aed' }}>
                        {sub?.name || 'Disciplina'}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>{alts.length} alternativas</span>
                    </div>
                    <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>
                      {q.questionText.length > 150 ? q.questionText.slice(0, 150) + '...' : q.questionText}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(q.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all flex-shrink-0"
                    title="Excluir">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateQuestionModal open={createModal} subjects={subjects} onSave={handleCreate} onClose={() => setCreateModal(false)} />
    </div>
  )
}
