import { useState, useEffect, useRef } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { cycleApi, sessionApi } from '../services/api'
import { useToast } from '../context/ToastContext'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Cycle() {
  const toast = useToast()
  const [subjects, setSubjects] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [stopModal, setStopModal] = useState(false)
  const [stopForm, setStopForm] = useState({ content: '', correctAnswers: '', wrongAnswers: '' })
  const [starting, setStarting] = useState(null)
  const [stopping, setStopping] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    cycleApi.get()
      .then(setSubjects)
      .catch(() => toast.error('Erro ao carregar ciclo de estudos.'))
  }, [])

  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [activeSession])

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
    } catch {
      toast.error('Erro ao encerrar sessão. Tente novamente.')
    } finally {
      setStopping(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ciclo de Estudos</h1>
        <p className="text-slate-400 text-sm">Disciplinas ordenadas por prioridade</p>
      </div>

      {activeSession && (
        <Card className="border-violet-500/50 bg-violet-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Estudando agora</p>
              <p className="text-lg font-bold" style={{ color: activeSession.subjectColor }}>{activeSession.subjectName}</p>
              <p className="text-4xl font-mono font-bold text-white mt-1">{formatTime(elapsed)}</p>
            </div>
            <Button variant="danger" size="lg" onClick={openStop}>Parar</Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {subjects.map((s, i) => (
          <Card key={s.id} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-slate-300 bg-slate-700">
              {i + 1}
            </div>
            <div className="w-3 h-8 rounded-full" style={{ background: s.color }} />
            <div className="flex-1">
              <p className="font-semibold text-white">{s.name}</p>
              <div className="flex gap-2 mt-1">
                <Badge color={s.color}>Prioridade {s.priority}</Badge>
                <Badge color="#64748b">{s.weeklyHours}h/sem</Badge>
              </div>
            </div>
            {!activeSession && (
              <Button onClick={() => startStudy(s)} disabled={!!starting}>
                {starting === s.id ? '...' : '▶ Iniciar'}
              </Button>
            )}
          </Card>
        ))}
        {subjects.length === 0 && (
          <p className="text-slate-500">Nenhuma disciplina no ciclo. Cadastre disciplinas primeiro.</p>
        )}
      </div>

      <Modal open={stopModal} onClose={() => !stopping && setStopModal(false)} title="Encerrar Sessão">
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-sm">Tempo estudado</p>
            <p className="text-3xl font-mono font-bold text-white">{formatTime(elapsed)}</p>
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
