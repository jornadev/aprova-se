import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { subjectApi } from '../services/api'
import { useToast } from '../context/ToastContext'

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#7c3aed', '#a855f7', '#ec4899', '#06b6d4']

function SubjectForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', color: '#7c3aed', priority: 3, weeklyHours: 4 })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-4">
      <Input label="Nome" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Direito Constitucional" />
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <Input label="Prioridade (1-5)" type="number" min={1} max={5} value={form.priority} onChange={e => set('priority', +e.target.value)} />
      <Input label="Horas semanais" type="number" min={0.5} max={40} step={0.5} value={form.weeklyHours} onChange={e => set('weeklyHours', +e.target.value)} />
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} className="flex-1">Salvar</Button>
        <Button variant="ghost" onClick={onCancel} className="flex-1">Cancelar</Button>
      </div>
    </div>
  )
}

export default function Subjects() {
  const toast = useToast()
  const [subjects, setSubjects] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const data = await subjectApi.getAll()
      setSubjects(data)
    } catch {
      toast.error('Erro ao carregar disciplinas. Tente recarregar a página.')
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form) => {
    setSaving(true)
    try {
      if (editing) {
        await subjectApi.update(editing.id, form)
        toast.success('Disciplina atualizada!')
      } else {
        await subjectApi.create(form)
        toast.success('Disciplina criada!')
      }
      setModalOpen(false)
      setEditing(null)
      load()
    } catch {
      toast.error('Erro ao salvar disciplina. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir disciplina? Esta ação também removerá todos os tópicos associados.')) return
    try {
      await subjectApi.delete(id)
      setSubjects(prev => prev.filter(s => s.id !== id))
      toast.success('Disciplina excluída.')
    } catch {
      toast.error('Erro ao excluir disciplina. Tente novamente.')
    }
  }

  const openEdit = (subject) => {
    setEditing(subject)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Disciplinas</h1>
          <p className="text-slate-400 text-sm">Gerencie suas matérias de estudo</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>+ Nova Disciplina</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(s => (
          <Card key={s.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="font-semibold text-white flex-1">{s.name}</span>
            </div>
            <div className="flex gap-2">
              <Badge color={s.color}>Prioridade {s.priority}</Badge>
              <Badge color="#64748b">{s.weeklyHours}h/sem</Badge>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => openEdit(s)} className="flex-1">Editar</Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)} className="flex-1">Excluir</Button>
            </div>
          </Card>
        ))}
        {subjects.length === 0 && (
          <div className="col-span-full">
            <Card>
              <p className="text-slate-500 text-center py-6">Nenhuma disciplina cadastrada ainda.</p>
            </Card>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? 'Editar Disciplina' : 'Nova Disciplina'}>
        <SubjectForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditing(null) }}
        />
        {saving && <p className="text-xs text-slate-400 mt-2 text-center">Salvando...</p>}
      </Modal>
    </div>
  )
}
