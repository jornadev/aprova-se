import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const ToastContext = createContext(null)

const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16, color: '#22c55e', flexShrink: 0 }}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0 }}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16, color: '#f59e0b', flexShrink: 0 }}>
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16, color: '#7c3aed', flexShrink: 0 }}>
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  ),
}

const ACCENT = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#7c3aed' }
const DURATION = { success: 3500, error: 5000, warning: 4000, info: 3500 }

let _id = 0

function ToastItem({ toast: t, onRemove }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const dismiss = useCallback(() => {
    setLeaving(true)
    setTimeout(() => onRemove(t.id), 260)
  }, [t.id, onRemove])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(dismiss, DURATION[t.type])
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [])

  return (
    <div
      role="alert"
      onClick={dismiss}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        background: 'var(--bg-card)',
        border: '1px solid var(--bdr-md)',
        borderLeft: `3px solid ${ACCENT[t.type]}`,
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        cursor: 'pointer',
        maxWidth: 340,
        width: '100%',
        userSelect: 'none',
        transform: visible && !leaving ? 'translateX(0) scale(1)' : 'translateX(112%) scale(0.95)',
        opacity: visible && !leaving ? 1 : 0,
        transition: leaving
          ? 'transform 0.24s ease-in, opacity 0.24s'
          : 'transform 0.32s cubic-bezier(0.34,1.4,0.64,1), opacity 0.28s',
      }}
    >
      <div style={{ marginTop: 1 }}>{ICONS[t.type]}</div>
      <p style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.45, color: 'var(--text-2)', margin: 0 }}>
        {t.message}
      </p>
      <button
        onClick={e => { e.stopPropagation(); dismiss() }}
        aria-label="Fechar"
        style={{
          flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-mut)', fontSize: 18, lineHeight: 1, padding: 0, marginTop: -1,
        }}
      >
        ×
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    setToasts(prev => [...prev.slice(-3), { id: ++_id, message, type }])
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info:    (msg) => addToast(msg, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
            display: 'flex', flexDirection: 'column', gap: 8,
            alignItems: 'flex-end', pointerEvents: toasts.length ? 'auto' : 'none',
          }}
        >
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onRemove={removeToast} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
