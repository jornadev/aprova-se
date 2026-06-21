import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import CookieBanner from './components/CookieBanner'
import Sidebar from './components/Sidebar'
import FloatingTimer from './components/FloatingTimer'
import OnboardingTour from './components/OnboardingTour'

const Landing     = lazy(() => import('./pages/Landing'))
const Terms       = lazy(() => import('./pages/Terms'))
const NotFound    = lazy(() => import('./pages/NotFound'))
const Dashboard   = lazy(() => import('./pages/Dashboard'))
const Subjects    = lazy(() => import('./pages/Subjects'))
const Cycle       = lazy(() => import('./pages/Cycle'))
const WeeklyPlan  = lazy(() => import('./pages/WeeklyPlan'))
const History     = lazy(() => import('./pages/History'))
const Revisions   = lazy(() => import('./pages/Revisions'))
const Topics      = lazy(() => import('./pages/Topics'))
const Simulations = lazy(() => import('./pages/Simulations'))
const Stats       = lazy(() => import('./pages/Stats'))
const Preferences = lazy(() => import('./pages/Preferences'))
const Profile     = lazy(() => import('./pages/Profile'))
const StudyRoom     = lazy(() => import('./pages/StudyRoom'))
const Login           = lazy(() => import('./pages/Login'))
const Register        = lazy(() => import('./pages/Register'))
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword   = lazy(() => import('./pages/ResetPassword'))

const FULL_BLEED_ROUTES = ['/study-room']

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-violet-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function AppLayout() {
  const { pathname } = useLocation()
  const fullBleed = FULL_BLEED_ROUTES.includes(pathname)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Hamburger button — mobile only */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden w-9 h-9 flex items-center justify-center rounded-lg"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-md)', color: 'var(--text-3)' }}
        onClick={() => setMobileNavOpen(o => !o)}
        aria-label="Menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-5 h-5">
          {mobileNavOpen
            ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
            : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
          }
        </svg>
      </button>

      <OnboardingTour />
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <FloatingTimer />
      <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-56'} overflow-auto flex flex-col transition-all duration-300 ${fullBleed ? '' : 'p-6 pt-16 lg:pt-6'}`}>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/subjects"   element={<Subjects />} />
            <Route path="/cycle"      element={<Cycle />} />
            <Route path="/weekly-plan"element={<WeeklyPlan />} />
            <Route path="/history"    element={<History />} />
            <Route path="/revisions"  element={<Revisions />} />
            <Route path="/topics"     element={<Topics />} />
            <Route path="/simulations"element={<Simulations />} />
            <Route path="/stats"      element={<Stats />} />
            <Route path="/preferences"element={<Preferences />} />
            <Route path="/profile"    element={<Profile />} />
            <Route path="/study-room" element={<StudyRoom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
        <AuthProvider>
        <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--bg-page)' }}/>}>
          <CookieBanner />
          <Routes>
            <Route path="/"                  element={<Landing />} />
            <Route path="/login"             element={<Login />} />
            <Route path="/register"          element={<Register />} />
            <Route path="/forgot-password"   element={<ForgotPassword />} />
            <Route path="/reset-password"    element={<ResetPassword />} />
            <Route path="/terms"             element={<Terms />} />
            <Route path="/privacy"           element={<Terms />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
        </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
