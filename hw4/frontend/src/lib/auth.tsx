import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchCurrentUser, logIn, logOut, registerAccount } from './api'
import type { AuthUser, RegisterInput } from './api'

interface AuthContextValue {
  /** undefined while the initial session check is running, null when logged out. */
  user: AuthUser | null | undefined
  login: (email: string, password: string) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Holds the logged-in user (from the backend session cookie) for the whole app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined)

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await logIn(email, password)
    setUser(loggedIn)
    return loggedIn
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const created = await registerAccount(input)
    setUser(created)
    return created
  }, [])

  const logout = useCallback(async () => {
    await logOut()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
