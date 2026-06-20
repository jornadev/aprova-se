import { useState, useEffect } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { revisionApi, subjectApi } from '../services/api'
import { useToast } from '../context/ToastContext'

export default function Revisions() {
  const toast = useToast()
  const [today, setToday] = useState([])
  const [pending, setPending] = useState([])
  const [subjects, setSubjects] = useState({})
  const [tab, setTab] = useState('today')
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(null)

  const load = async () => {
    try {
      const [t, p, s] = await Promise.all([
        revisionApi.getToday(),
        revisionApi.getPending(),
        subjectApi.getAll()
      ])
      setToday(t)
      setPending(p)
      const map = {}
      s.forEach(sub => { map[sub.id] = sub })
      setSubjects(map)
    } catch {
      toast.error('Erro ao carregar revisões. Tente recarregar a página.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const complete = async (id) => {
    setCompleting(id)
    try {
      await revisionApi.complete(id)
      toast.success('Revisão concluída!')
      load()
    } catch {
      toast.error('Erro ao concluir revisão. Tente novamente.')
    } finally {
      setCompleting(null)
    }
  }

  const list = tab === 'today' ? today : pending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Revisões</h1>
        <p className="text-slate-400 text-sm">Revisões espaçadas programadas</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('today')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'today' ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
        >
          Hoje ({today.length})
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'pending' ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
        >
          Pendentes ({pending.length})
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 animate-pulse">Carregando...</p>
      ) : (
        <div className="space-y-3">
          {list.map(r => {
            const subject = subjects[r.subject?.id]
            const isOverdue = new Date(r.scheduledDate) < new Date(new Date().toDateString())
            return (
              <Card key={r.id} className="flex items-center gap-4">
                <div className="w-2.5 h-10 rounded-full flex-shrink-0" style={{ background: subject?.color || '#64748b' }} />
                <div className="flex-1">
                  <p className="font-medium text-white">{subject?.name || 'Desconhecida'}</p>
                  <p className="text-xs text-slate-400">
                    Agendada: {new Date(r.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                    {r.intervalDays && ` • Intervalo: ${r.intervalDays} dias`}
                  </p>
                </div>
                {isOverdue && tab === 'pending' && (
                  <Badge color="#ef4444">Atrasada</Badge>
                )}
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => complete(r.id)}
                  disabled={completing === r.id}
                >
                  {completing === r.id ? '...' : 'Concluir'}
                </Button>
              </Card>
            )
          })}
          {list.length === 0 && (
            <Card>
              <p className="text-slate-500 text-center py-4">
                {tab === 'today' ? 'Nenhuma revisão para hoje. Bom trabalho!' : 'Nenhuma revisão pendente.'}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
