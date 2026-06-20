import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { sessionApi, subjectApi } from '../services/api'
import { useToast } from '../context/ToastContext'

function formatDuration(minutes) {
  if (!minutes) return '-'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`
}

export default function History() {
  const toast = useToast()
  const [sessions, setSessions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [filters, setFilters] = useState({ subjectId: '', from: '', to: '' })
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ subjectId: '', startedAt: '', duration: '', content: '', correctAnswers: '', wrongAnswers: '' })
  const [saving, setSaving] = useState(false)

  const load = async (p = 0) => {
    try {
      const params = { page: p, size: 20 }
      if (filters.subjectId) params.subjectId = filters.subjectId
      if (filters.from) params.from = filters.from + 'T00:00:00'
      if (filters.to) params.to = filters.to + 'T23:59:59'
      const data = await sessionApi.getHistory(params)
      setSessions(data.content || [])
      setTotalPages(data.totalPages || 0)
      setPage(p)
    } catch {
      toast.error('Erro ao carregar histórico.')
    }
  }

  useEffect(() => {
    subjectApi.getAll().then(setSubjects).catch(() => toast.error('Erro ao carregar disciplinas.'))
  }, [])
  useEffect(() => { load(0) }, [filters])

  const handleDelete = async (id) => {
    if (!confirm('Excluir sessão?')) return
    try {
      await sessionApi.delete(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      toast.success('Sessão excluída.')
    } catch {
      toast.error('Erro ao excluir sessão.')
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      await sessionApi.create({
        subject: { id: +form.subjectId },
        startedAt: form.startedAt,
        duration: +form.duration,
        content: form.content || null,
        correctAnswers: form.correctAnswers ? +form.correctAnswers : null,
        wrongAnswers: form.wrongAnswers ? +form.wrongAnswers : null,
      })
      setModal(false)
      load(0)
      toast.success('Sessão registrada!')
    } catch {
      toast.error('Erro ao registrar sessão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const subjectMap = subjects.reduce((m, s) => { m[s.id] = s; return m }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Histórico</h1>
          <p className="text-slate-400 text-sm">Todas as suas sessões de estudo</p>
        </div>
        <Button onClick={() => setModal(true)}>+ Registro Manual</Button>
      </div>

      <Card>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-slate-400 mb-1 block">Disciplina</label>
            <select
              value={filters.subjectId}
              onChange={e => setFilters(f => ({ ...f, subjectId: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
            >
              <option value="">Todas</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Input label="De" type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          <Input label="Até" type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          <div className="flex items-end">
            <Button variant="ghost" onClick={() => setFilters({ subjectId: '', from: '', to: '' })}>Limpar</Button>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        {sessions.map(s => {
          const subject = subjectMap[s.subject?.id]
          return (
            <Card key={s.id} className="flex items-center gap-4">
              <div className="w-2.5 h-10 rounded-full" style={{ background: subject?.color || '#64748b' }} />
              <div className="flex-1">
                <p className="font-medium text-white">{subject?.name || 'Desconhecida'}</p>
                <p className="text-xs text-slate-400">
                  {s.startedAt ? new Date(s.startedAt).toLocaleString('pt-BR') : '-'}
                  {s.content && ` • ${s.content}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-violet-400">{formatDuration(s.duration)}</p>
                {(s.correctAnswers != null || s.wrongAnswers != null) && (
                  <p className="text-xs text-slate-500">{s.correctAnswers ?? 0}✓ {s.wrongAnswers ?? 0}✗</p>
                )}
              </div>
              <button onClick={() => handleDelete(s.id)} className="text-slate-600 hover:text-red-400 ml-2 w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-red-500/10"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </Card>
          )
        })}
        {sessions.length === 0 && <p className="text-slate-500">Nenhuma sessão encontrada.</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" onClick={() => load(page - 1)} disabled={page === 0}>←</Button>
          <span className="px-3 py-2 text-sm text-slate-400">{page + 1} / {totalPages}</span>
          <Button variant="ghost" onClick={() => load(page + 1)} disabled={page >= totalPages - 1}>→</Button>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Registro Manual de Sessão">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Disciplina</label>
            <select
              value={form.subjectId}
              onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Selecione...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Input label="Data/hora início" type="datetime-local" value={form.startedAt} onChange={e => setForm(f => ({ ...f, startedAt: e.target.value }))} />
          <Input label="Duração (minutos)" type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          <Input label="Conteúdo (opcional)" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="O que estudou?" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Acertos" type="number" min={0} value={form.correctAnswers} onChange={e => setForm(f => ({ ...f, correctAnswers: e.target.value }))} />
            <Input label="Erros" type="number" min={0} value={form.wrongAnswers} onChange={e => setForm(f => ({ ...f, wrongAnswers: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreate} disabled={saving || !form.subjectId || !form.startedAt || !form.duration} className="flex-1">{saving ? 'Salvando...' : 'Salvar'}</Button>
            <Button variant="ghost" onClick={() => setModal(false)} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
