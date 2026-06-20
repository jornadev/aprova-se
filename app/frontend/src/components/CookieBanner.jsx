import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  const reject = () => {
    localStorage.setItem(STORAGE_KEY, 'essential')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 8000,
        padding: '0 1rem 1rem',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '1rem',
          padding: detailsOpen ? '20px 20px 16px' : '16px 20px',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
          pointerEvents: 'all',
          transition: 'padding 0.2s',
        }}
      >
        {/* Main row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flexShrink: 0, marginTop: 1, color: '#a78bfa' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
              <path d="M8.5 8.5v.01M16 15.5v.01M12 12v.01"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
              Usamos cookies essenciais para manter sua sessão ativa e melhorar sua experiência.
              Não utilizamos cookies de rastreamento para publicidade.{' '}
              <button
                onClick={() => setDetailsOpen(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: '0.85rem', padding: 0, textDecoration: 'underline' }}
              >
                {detailsOpen ? 'Ocultar detalhes' : 'Saiba mais'}
              </button>
            </p>

            {detailsOpen && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(30,41,59,0.6)', borderRadius: '0.6rem', border: '1px solid #1e293b' }}>
                <p style={{ fontSize: '0.78rem', margin: '0 0 8px', fontWeight: 600, color: '#e2e8f0' }}>Cookies que utilizamos:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <CookieItem
                    name="token"
                    desc="Mantém você logado na plataforma. Essencial — não pode ser desativado."
                    essential
                  />
                  <CookieItem
                    name="cookie_consent"
                    desc="Salva sua preferência sobre cookies. Essencial — não pode ser desativado."
                    essential
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '10px 0 0' }}>
                  Não compartilhamos seus dados com terceiros para fins publicitários. Seus dados são tratados conforme a LGPD (Lei nº 13.709/2018).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={reject}
            style={{
              padding: '8px 16px', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 500,
              background: 'none', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer',
            }}
          >
            Somente essenciais
          </button>
          <button
            onClick={accept}
            style={{
              padding: '8px 20px', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600,
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', cursor: 'pointer',
            }}
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}

function CookieItem({ name, desc, essential }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{
        fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
        background: essential ? 'rgba(34,197,94,0.12)' : 'rgba(124,58,237,0.12)',
        color: essential ? '#86efac' : '#c4b5fd',
        flexShrink: 0, marginTop: 1,
      }}>
        {essential ? 'Essencial' : 'Funcional'}
      </span>
      <div>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>{name}</span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}> — {desc}</span>
      </div>
    </div>
  )
}
