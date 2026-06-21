import { useState, useEffect, useRef } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { preferencesApi, userApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const ESTADOS = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

function cropToSquareBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new Image()
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const min = Math.min(img.width, img.height)
        const sx = (img.width - min) / 2
        const sy = (img.height - min) / 2
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = ev.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)

  const [name, setName] = useState(user?.name || '')
  const [concurso, setConcurso] = useState('')
  const [estado, setEstado] = useState('')
  const [avatarData, setAvatarData] = useState(null)
  const [avatarChanged, setAvatarChanged] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    preferencesApi.get()
      .then(prefs => {
        if (prefs.concurso) setConcurso(prefs.concurso)
        if (prefs.estado) setEstado(prefs.estado)
        if (prefs.avatarData) setAvatarData(prefs.avatarData)
      })
      .catch(() => toast.error('Erro ao carregar dados do perfil.'))
      .finally(() => setLoading(false))
  }, [])

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 5MB.')
      return
    }
    const b64 = await cropToSquareBase64(file)
    setAvatarData(b64)
    setAvatarChanged(true)
    e.target.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const prefsPayload = {
        concurso: concurso || null,
        estado: estado || null,
        ...(avatarChanged && avatarData ? { avatarData } : {}),
      }
      const [updatedUser] = await Promise.all([
        userApi.updateProfile({ name }),
        preferencesApi.update(prefsPayload),
      ])
      updateUser(updatedUser)
      if (avatarChanged) {
        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { avatarData } }))
        setAvatarChanged(false)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      toast.success('Perfil atualizado!')
    } catch {
      toast.error('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  if (loading) return (
    <div className="flex items-center gap-1.5 py-20 justify-center">
      {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }}/>)}
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Perfil</h1>
        <p className="text-sm" style={{ color: 'var(--text-fad)' }}>Suas informações pessoais</p>
      </div>

      {/* Avatar */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-2)' }}>Foto de perfil</h2>
        <div className="flex items-center gap-5">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden group focus:outline-none"
          >
            {avatarData ? (
              <img src={avatarData} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
              >
                {initials}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </button>

          <div>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              Alterar foto
            </button>
            <p className="text-xs mt-1" style={{ color: 'var(--text-mut)' }}>JPG, PNG ou WEBP. A imagem é cortada em quadrado.</p>
            {avatarData && (
              <button
                onClick={() => { setAvatarData(null); setAvatarChanged(true) }}
                className="text-xs hover:text-red-400 transition-colors mt-1 block"
                style={{ color: 'var(--text-ghost)' }}
              >
                Remover foto
              </button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </Card>

      {/* Dados pessoais */}
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Dados pessoais</h2>

        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--text-fad)' }}>Nome</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-colors"
            style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}
          />
        </div>

        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--text-fad)' }}>E-mail</label>
          <input
            value={user?.email || ''}
            disabled
            className="w-full rounded-lg px-3 py-2.5 text-sm cursor-not-allowed"
            style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr)', color: 'var(--text-mut)', opacity: 0.6 }}
          />
        </div>
      </Card>

      {/* Sobre seu concurso */}
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Sobre seu concurso</h2>

        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--text-fad)' }}>Concurso que está estudando</label>
          <input
            value={concurso}
            onChange={e => setConcurso(e.target.value)}
            placeholder="Ex: Policial Penal RS 2026"
            className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-colors"
            style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}
          />
        </div>

        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--text-fad)' }}>Estado onde mora</label>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm transition-colors"
            style={{ background: 'var(--bg-elev)', border: '1px solid var(--bdr-md)', color: 'var(--text)' }}
          >
            <option value="">Selecione o estado...</option>
            {ESTADOS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving || !name.trim()} size="lg" className="flex-1">
          {saving ? 'Salvando...' : saved ? 'Salvo com sucesso!' : 'Salvar alterações'}
        </Button>
        {saved && (
          <span className="text-sm text-green-400 font-medium whitespace-nowrap">Perfil atualizado.</span>
        )}
      </div>
    </div>
  )
}
