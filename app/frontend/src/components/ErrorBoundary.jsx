import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
          style={{ width: 48, height: 48, color: '#ef4444', opacity: 0.8 }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
            Algo deu errado
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', margin: 0 }}>
            Um erro inesperado ocorreu nesta página.
          </p>
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            padding: '9px 20px', borderRadius: 8, background: '#7c3aed', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
          }}
        >
          Tentar novamente
        </button>
      </div>
    )
  }
}
