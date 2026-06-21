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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Revisões</h1>
        <p className="text-sm" style={{ color: 'var(--text-fad)' }}>Revisões espaçadas programadas</p>
      </div>

      <div className="flex gap-2">
        {['today', 'pending'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={tab === t
              ? { background: '#7c3aed', color: '#ffffff' }
              : { background: 'var(--bg-elev)', color: 'var(--text-mut)' }
            }
          >
            {t === 'today' ? `Hoje (${today.length})` : `Pendentes (${pending.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-1.5 py-20 justify-center">
          {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>)}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(r => {
            const subject = subjects[r.subject?.id]
            const isOverdue = new Date(r.scheduledDate) < new Date(new Date().toDateString())
            return (
              <Card key={r.id} className="flex items-center gap-4">
                <div className="w-2.5 h-10 rounded-full flex-shrink-0" style={{ background: subject?.color || '#64748b' }} />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{subject?.name || 'Desconhecida'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-fad)' }}>
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
            <div className="text-center py-16">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-ghost)' }}>
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
              </svg>
              <p className="font-medium" style={{ color: 'var(--text-3)' }}>
                {tab === 'today' ? 'Nenhuma revisão para hoje!' : 'Nenhuma revisão pendente.'}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-mut)' }}>
                {tab === 'today' ? 'Bom trabalho! Continue estudando para gerar novas revisões.' : 'As revisões aparecem automaticamente ao encerrar sessões de estudo.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
