import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ background: '#070b14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '6rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-4px', backgroundImage: 'linear-gradient(135deg, #7c3aed, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: '16px 0 8px' }}>
          Página não encontrada
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: 1.6, marginBottom: 32 }}>
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: 'white', fontSize: '0.9rem', fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
