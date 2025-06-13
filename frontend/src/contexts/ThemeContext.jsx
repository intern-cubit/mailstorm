import React, { createContext, useContext, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

// Theme Context
const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false)
  
  const toggleTheme = () => setIsDark(!isDark)
  
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={isDark ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}