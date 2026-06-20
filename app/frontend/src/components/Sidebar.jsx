import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useState, useEffect } from 'react'
import { preferencesApi } from '../services/api'

const I = {
  grid:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  book:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  rotate:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  calendar:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  clock:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  chart:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  clipboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  refresh:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>,
  users:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  layers:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  settings:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  logout:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
}

const NAV_GROUPS = [
  {
    label: 'Estudar',
    items: [
      { to: '/dashboard',   label: 'Dashboard',     icon: 'grid'      },
      { to: '/topics',      label: 'Edital',         icon: 'book'      },
      { to: '/cycle',       label: 'Ciclo',          icon: 'rotate'    },
      { to: '/weekly-plan', label: 'Planejamento',   icon: 'calendar'  },
    ],
  },
  {
    label: 'Analisar',
    items: [
      { to: '/history',     label: 'Histórico',      icon: 'clock'     },
      { to: '/stats',       label: 'Estatísticas',   icon: 'chart'     },
      { to: '/simulations', label: 'Simulados',      icon: 'clipboard' },
      { to: '/revisions',   label: 'Revisões',       icon: 'refresh'   },
    ],
  },
  {
    label: 'Espaço',
    items: [
      { to: '/study-room',  label: 'Sala de Estudos', icon: 'users'   },
      { to: '/subjects',    label: 'Disciplinas',      icon: 'layers'  },
      { to: '/preferences', label: 'Preferências',     icon: 'settings'},
    ],
  },
]

export default function Sidebar({ mobileOpen = false, onMobileClose = () => {} }) {
  const { user, logout } = useAuth()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [avatarData, setAvatarData] = useState(null)

  useEffect(() => {
    preferencesApi.get().then(prefs => {
      if (prefs.avatarData) setAvatarData(prefs.avatarData)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => setAvatarData(e.detail.avatarData)
    window.addEventListener('avatarUpdated', handler)
    return () => window.removeEventListener('avatarUpdated', handler)
  }, [])

  const initials = (user?.name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-56 flex flex-col z-40 transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
      style={{
        background: 'var(--bg-app)',
        borderRight: '1px solid var(--bdr)',
      }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <span className="text-lg font-black tracking-tight" style={{ background: 'linear-gradient(90deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          aprova.se
        </span>
        <button
          onClick={onMobileClose}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg"
          style={{ color: 'var(--text-mut)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p
              className="text-[10px] font-bold tracking-widest uppercase px-2 mb-1.5"
              style={{ color: isDark ? '#2a3550' : '#94a3b8' }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/dashboard'}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative`
                  }
                  style={({ isActive }) => isActive ? {
                    background: 'rgba(124,58,237,0.1)',
                    boxShadow: 'inset 2px 0 0 #7c3aed',
                    color: '#a78bfa',
                  } : {
                    color: 'var(--text-mut)',
                  }}
                  onMouseEnter={e => {
                    if (!e.currentTarget.dataset.active) e.currentTarget.style.color = 'var(--text-3)'
                  }}
                  onMouseLeave={e => {
                    if (!e.currentTarget.dataset.active) e.currentTarget.style.color = 'var(--text-mut)'
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{ color: isActive ? '#a78bfa' : undefined }} className="transition-colors">
                        {I[icon]}
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4" style={{ borderTop: '1px solid var(--bdr)' }}>
        <NavLink
          to="/profile"
          className="flex items-center gap-2.5 px-2 pt-4 pb-2 rounded-xl transition-colors group"
          style={({ isActive }) => isActive ? { color: '#a78bfa' } : {}}
        >
          {({ isActive }) => (
            <>
              <div
                className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden"
                style={{ boxShadow: isActive ? '0 0 0 2px #7c3aed44' : 'none' }}
              >
                {avatarData ? (
                  <img src={avatarData} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                  >
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate transition-colors" style={{ color: isActive ? '#a78bfa' : 'var(--text-2)' }}>
                  {user?.name}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-mut)' }}>{user?.email}</p>
              </div>
            </>
          )}
        </NavLink>

        <button
          onClick={() => { logout(); navigate('/login') }}
          className="w-full flex items-center gap-2 text-left text-[11px] px-2 py-1.5 rounded-lg transition-all hover:bg-red-500/5 hover:text-red-400"
          style={{ color: 'var(--text-mut)' }}
        >
          {I.logout}
          Sair da conta
        </button>
      </div>
    </aside>
  )
}
