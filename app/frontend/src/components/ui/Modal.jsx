import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl border p-6 w-full max-w-md mx-4 shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--bdr-md)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} className="transition-colors text-xl leading-none" style={{ color: 'var(--text-mut)' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
