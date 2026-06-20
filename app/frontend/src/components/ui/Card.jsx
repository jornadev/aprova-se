export default function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`} style={{ background: 'var(--bg-card)', borderColor: 'var(--bdr-md)' }}>
      {children}
    </div>
  )
}
