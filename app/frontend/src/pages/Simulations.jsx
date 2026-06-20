import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, ReferenceLine, Cell, Legend,
  AreaChart, Area, LabelList,
} from 'recharts'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import { simulationApi, subjectApi } from '../services/api'
import { useToast } from '../context/ToastContext'

const scoreColor = pct => pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'

const SUBJECT_PALETTE = ['#7c3aed', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6']

function calcOverall(results) {
  if (!results?.length) return null
  const correct = results.reduce((a, r) => a + (r.correct || 0), 0)
  const total = results.reduce((a, r) => a + (r.total || 0), 0)
  return total > 0 ? Math.round((correct / total) * 100) : null
}

function ScoreRing({ pct }) {
  const color = pct !== null ? scoreColor(pct) : '#334155'
  return (
    <div
      className="w-14 h-14 rounded-full border-2 flex-shrink-0 flex items-center justify-center font-bold text-sm leading-none"
      style={{ borderColor: color, color: pct !== null ? color : '#475569' }}
    >
      {pct !== null ? `${pct}%` : '--'}
    </div>
  )
}

function SubjectBar({ result, subject }) {
  const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0
  const color = scoreColor(pct)
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: subject?.color || '#475569' }} />
      <span className="text-xs text-slate-400 w-40 truncate flex-shrink-0">{subject?.name || 'Desconhecida'}</span>
      <div className="flex-1 bg-slate-700 rounded-full h-1.5 min-w-0">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-500 flex-shrink-0 w-12 text-right">{result.correct}/{result.total}</span>
      <span className="text-xs font-semibold flex-shrink-0 w-9 text-right" style={{ color }}>{pct}%</span>
    </div>
  )
}

function StatCard({ label, value, trend, color = false }) {
  const displayColor = color && value !== null ? scoreColor(value) : '#e2e8f0'
  const trendColor = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#64748b'
  const trendArrow = trend > 0 ? '↑' : trend < 0 ? '↓' : '→'
  return (
    <Card className="flex flex-col justify-between">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-3xl font-bold" style={{ color: displayColor }}>
          {value !== null && value !== undefined ? (color ? `${value}%` : value) : '--'}
        </p>
        {trend !== null && trend !== undefined && (
          <span className="text-sm font-semibold mb-1" style={{ color: trendColor }}>
            {trendArrow} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </Card>
  )
}

function SimCard({ sim, results, subjects, onAddResult, onDelete, expanded, onToggle }) {
  const subjectMap = subjects.reduce((m, s) => { m[s.id] = s; return m }, {})
  const overall = calcOverall(results)

  const chartData = results.map(r => {
    const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
    return {
      name: (subjectMap[r.subject?.id]?.name || '?').split(' ')[0],
      pct,
      fill: scoreColor(pct),
    }
  })

  return (
    <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <ScoreRing pct={overall} />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">{sim.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {sim.examDate ? `Prova: ${new Date(sim.examDate + 'T00:00:00').toLocaleDateString('pt-BR')} · ` : ''}
            {new Date(sim.createdAt).toLocaleDateString('pt-BR')}
            {results.length > 0 && ` · ${results.length} disciplina${results.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onAddResult(sim.id)}
            className="px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 text-xs font-medium transition-colors"
          >
            + Resultado
          </button>
          {results.length > 0 && (
            <button
              onClick={() => onToggle(sim.id)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 text-xs transition-colors"
            >
              {expanded ? 'Fechar' : 'Gráfico'}
            </button>
          )}
          <button
            onClick={() => onDelete(sim.id)}
            className="w-7 h-7 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Mini bars — collapsed view */}
      {!expanded && results.length > 0 && (
        <div className="px-5 pb-4 pt-1 border-t border-slate-800 space-y-2.5">
          {results.map(r => (
            <SubjectBar key={r.id} result={r} subject={subjectMap[r.subject?.id]} />
          ))}
        </div>
      )}

      {/* Expanded — bar chart + bars */}
      {expanded && (
        <div className="border-t border-slate-700/50 px-5 py-4 space-y-5">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Desempenho por disciplina</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 20, right: 4, left: -20, bottom: 24 }}>
                <defs>
                  <pattern id="zoneRed" patternUnits="userSpaceOnUse" width="4" height="4">
                    <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#ef4444" strokeWidth="0.4" opacity="0.3"/>
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f22" vertical={false} />
                <ReferenceArea y1={0} y2={50} fill="#ef4444" fillOpacity={0.04} />
                <ReferenceArea y1={50} y2={70} fill="#f59e0b" fillOpacity={0.04} />
                <ReferenceArea y1={70} y2={100} fill="#22c55e" fillOpacity={0.04} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [`${v}%`, 'Aproveitamento']}
                  cursor={{ fill: '#ffffff08' }}
                />
                <ReferenceLine
                  y={70}
                  stroke="#22c55e"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: 'meta 70%', position: 'insideTopRight', fill: '#22c55e', fontSize: 9 }}
                />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                  <LabelList
                    dataKey="pct"
                    position="top"
                    formatter={v => `${v}%`}
                    style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2.5">
            {results.map(r => (
              <SubjectBar key={r.id} result={r} subject={subjectMap[r.subject?.id]} />
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && (
        <div className="border-t border-slate-800 px-5 py-4">
          <p className="text-slate-600 text-xs text-center">Clique em "+ Resultado" para registrar o desempenho por disciplina.</p>
        </div>
      )}
    </div>
  )
}

const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
    {payload.map((entry, i) => (
      <span key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
        <span className="inline-block w-3 h-0.5 rounded" style={{ background: entry.color }} />
        {entry.value}
      </span>
    ))}
  </div>
)

export default function Simulations() {
  const toast = useToast()
  const [simulations, setSimulations] = useState([])
  const [resultsBySimId, setResultsBySimId] = useState({})
  const [subjects, setSubjects] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', examDate: '' })
  const [resultForm, setResultForm] = useState({ subjectId: '', correct: '', total: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    try {
      const [sims, subs] = await Promise.all([simulationApi.getAll(), subjectApi.getAll()])
      const sorted = [...sims].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      setSimulations(sorted)
      setSubjects(subs)
      const entries = await Promise.all(
        sorted.map(s => simulationApi.getResults(s.id).then(r => [s.id, r]))
      )
      setResultsBySimId(Object.fromEntries(entries))
    } catch {
      toast.error('Erro ao carregar simulados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const handleCreate = async () => {
    try {
      await simulationApi.create({ name: createForm.name, examDate: createForm.examDate || null })
      setCreateModal(false)
      setCreateForm({ name: '', examDate: '' })
      loadAll()
      toast.success('Simulado criado!')
    } catch {
      toast.error('Erro ao criar simulado. Tente novamente.')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir este simulado?')) return
    try {
      await simulationApi.delete(id)
      setSimulations(prev => prev.filter(s => s.id !== id))
      toast.success('Simulado excluído.')
    } catch {
      toast.error('Erro ao excluir simulado.')
    }
  }

  const handleAddResult = async () => {
    if (!resultForm.subjectId || !resultForm.correct || !resultForm.total) return
    setSaving(true)
    try {
      await simulationApi.addResult(addingTo, {
        subject: { id: +resultForm.subjectId },
        correct: +resultForm.correct,
        total: +resultForm.total,
      })
      const updated = await simulationApi.getResults(addingTo)
      setResultsBySimId(prev => ({ ...prev, [addingTo]: updated }))
      setResultForm({ subjectId: '', correct: '', total: '' })
      setAddingTo(null)
      toast.success('Resultado registrado!')
    } catch {
      toast.error('Erro ao salvar resultado. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // Summary stats
  const overalls = simulations
    .map(s => ({ name: s.name.split(' ').slice(0, 2).join(' '), pct: calcOverall(resultsBySimId[s.id]) }))
    .filter(d => d.pct !== null)

  const avgScore = overalls.length ? Math.round(overalls.reduce((a, d) => a + d.pct, 0) / overalls.length) : null
  const bestScore = overalls.length ? Math.max(...overalls.map(d => d.pct)) : null
  const lastScore = overalls.length ? overalls[overalls.length - 1].pct : null
  const trend = overalls.length >= 2
    ? overalls[overalls.length - 1].pct - overalls[overalls.length - 2].pct
    : null

  // Per-subject evolution across simulations
  const subjectMapGlobal = subjects.reduce((m, s) => { m[s.id] = s; return m }, {})
  const simsWithResults = simulations.filter(s => (resultsBySimId[s.id] || []).length > 0)

  const allSubjectIdsInResults = [...new Set(
    simsWithResults.flatMap(s => (resultsBySimId[s.id] || []).map(r => r.subject?.id).filter(Boolean))
  )]

  const subjectEvolutionData = simsWithResults.map(s => {
    const row = { name: s.name.split(' ').slice(0, 2).join(' ') }
    ;(resultsBySimId[s.id] || []).forEach(r => {
      const subj = subjectMapGlobal[r.subject?.id]
      if (subj) row[subj.name] = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
    })
    return row
  })

  const subjectNamesForChart = allSubjectIdsInResults
    .map(id => subjectMapGlobal[id]?.name)
    .filter(Boolean)

  const previewPct = resultForm.correct && resultForm.total && +resultForm.total > 0
    ? Math.round((+resultForm.correct / +resultForm.total) * 100)
    : null

  if (loading) return <div className="text-slate-400 animate-pulse">Carregando simulados...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Simulados</h1>
          <p className="text-slate-400 text-sm">Registre suas provas e acompanhe a evolução</p>
        </div>
        <Button onClick={() => setCreateModal(true)}>+ Novo Simulado</Button>
      </div>

      {simulations.length > 0 && (
        <div className="space-y-4">
          {/* Stat cards row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Simulados" value={simulations.length} />
            <StatCard label="Média geral" value={avgScore} color />
            <StatCard label="Melhor resultado" value={bestScore} color />
            <StatCard label="Último resultado" value={lastScore} trend={trend} color />
          </div>

          {/* Overall evolution chart */}
          <Card>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-4">Evolução geral</p>
            {overalls.length >= 2 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={overalls} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    formatter={v => [`${v}%`, 'Aproveitamento']}
                    labelStyle={{ color: '#64748b' }}
                    cursor={{ stroke: '#334155', strokeWidth: 1 }}
                  />
                  <Area
                    type="natural"
                    dataKey="pct"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#gradOverall)"
                    dot={{ r: 3, fill: '#7c3aed', stroke: '#0f172a', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#7c3aed', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-36 flex items-center justify-center">
                <p className="text-slate-600 text-sm text-center">
                  {overalls.length === 0
                    ? 'Adicione resultados aos simulados para ver a evolução.'
                    : 'O gráfico aparece a partir do 2º simulado com resultados.'}
                </p>
              </div>
            )}
          </Card>

          {/* Per-subject evolution */}
          {simsWithResults.length >= 2 && subjectNamesForChart.length > 0 && (
            <Card>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-4">Evolução por disciplina</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={subjectEvolutionData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [`${v}%`, name]}
                    labelStyle={{ color: '#64748b' }}
                    cursor={{ stroke: '#334155', strokeWidth: 1 }}
                  />
                  <Legend content={<CustomLegend />} />
                  {subjectNamesForChart.map((name, i) => {
                    const color = SUBJECT_PALETTE[i % SUBJECT_PALETTE.length]
                    return (
                      <Line
                        key={name}
                        type="natural"
                        dataKey={name}
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 3, fill: color, stroke: '#0f172a', strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: color, stroke: '#0f172a', strokeWidth: 2 }}
                        connectNulls
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* Simulation cards */}
      <div className="space-y-3">
        {[...simulations].reverse().map(sim => (
          <SimCard
            key={sim.id}
            sim={sim}
            results={resultsBySimId[sim.id] || []}
            subjects={subjects}
            onAddResult={id => { setAddingTo(id); setResultForm({ subjectId: '', correct: '', total: '' }) }}
            onDelete={handleDelete}
            expanded={expandedId === sim.id}
            onToggle={id => setExpandedId(prev => prev === id ? null : id)}
          />
        ))}

        {simulations.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 font-medium">Nenhum simulado registrado ainda</p>
            <p className="text-slate-600 text-sm mt-1">Clique em "+ Novo Simulado" para começar</p>
          </div>
        )}
      </div>

      {/* Modal criar simulado */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Novo Simulado">
        <div className="space-y-4">
          <Input
            label="Nome do simulado"
            value={createForm.name}
            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Simulado PP-RS — Fase 1"
            autoFocus
          />
          <Input
            label="Data da prova (opcional)"
            type="date"
            value={createForm.examDate}
            onChange={e => setCreateForm(f => ({ ...f, examDate: e.target.value }))}
          />
          <div className="flex gap-3">
            <Button onClick={handleCreate} disabled={!createForm.name.trim()} className="flex-1">Criar</Button>
            <Button variant="ghost" onClick={() => setCreateModal(false)} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal adicionar resultado */}
      <Modal
        open={!!addingTo}
        onClose={() => setAddingTo(null)}
        title={`Resultado — ${simulations.find(s => s.id === addingTo)?.name || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Disciplina</label>
            <select
              value={resultForm.subjectId}
              onChange={e => setResultForm(f => ({ ...f, subjectId: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            >
              <option value="">Selecione a disciplina...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Acertos"
              type="number"
              min={0}
              value={resultForm.correct}
              onChange={e => setResultForm(f => ({ ...f, correct: e.target.value }))}
              placeholder="Ex: 14"
            />
            <Input
              label="Total de questões"
              type="number"
              min={1}
              value={resultForm.total}
              onChange={e => setResultForm(f => ({ ...f, total: e.target.value }))}
              placeholder="Ex: 20"
            />
          </div>

          {/* Preview do aproveitamento */}
          {previewPct !== null && (
            <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs text-slate-500">Aproveitamento</p>
                <div className="w-32 bg-slate-700 rounded-full h-1.5 mt-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${previewPct}%`, background: scoreColor(previewPct) }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold" style={{ color: scoreColor(previewPct) }}>
                {previewPct}%
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleAddResult}
              disabled={!resultForm.subjectId || !resultForm.correct || !resultForm.total || saving}
              className="flex-1"
              variant="success"
            >
              {saving ? 'Salvando...' : 'Salvar resultado'}
            </Button>
            <Button variant="ghost" onClick={() => setAddingTo(null)} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
