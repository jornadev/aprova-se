export default function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={`rounded-xl border p-4 ${hover ? 'hover:border-violet-500/20' : ''} ${className}`}
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--bdr-md)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {children}
    </div>
  )
}
