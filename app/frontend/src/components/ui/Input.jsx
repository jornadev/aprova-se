export default function Input({ label, type = 'text', value, onChange, placeholder, className = '', min, max, step, autoFocus }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm" style={{ color: 'var(--text-fad)' }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        autoFocus={autoFocus}
        className={`rounded-xl px-3.5 py-2.5 text-sm placeholder-slate-500 focus:outline-none ${className}`}
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--bdr-md)',
          color: 'var(--text)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={e => {
          e.target.style.borderColor = '#7c3aed'
          e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1)'
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--bdr-md)'
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
