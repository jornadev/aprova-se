import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeCtx = createContext({ theme: 'dark', isDark: true, setTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('aprova-theme') ?? 'dark'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  const setTheme = useCallback((t) => {
    setThemeState(t)
    localStorage.setItem('aprova-theme', t)
  }, [])

  return (
    <ThemeCtx.Provider value={{ theme, isDark: theme === 'dark', setTheme }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
