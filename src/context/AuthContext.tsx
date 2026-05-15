import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'

interface AuthState {
  token: string | null
  username: string | null
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    if (!localStorage.getItem('token')) {
      localStorage.setItem('token', 'local')
      localStorage.setItem('username', 'me')
    }
    return {
      token: localStorage.getItem('token'),
      username: localStorage.getItem('username'),
    }
  })

  const persist = (token: string, username: string) => {
    localStorage.setItem('token', token)
    localStorage.setItem('username', username)
    setAuth({ token, username })
  }

  const login = async (username: string, password: string) => {
    const data = await api.login(username, password)
    persist(data.token, data.username)
  }

  const register = async (username: string, password: string) => {
    const data = await api.register(username, password)
    persist(data.token, data.username)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setAuth({ token: null, username: null })
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
