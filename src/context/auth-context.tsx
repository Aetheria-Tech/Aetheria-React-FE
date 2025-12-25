"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { authStorage } from "@/services/auth-storage"
import type { AuthPayload, AuthTokens, User } from "@/types/auth"
import { LoadingSpinner } from "@/components/loading-spinner"

interface AuthContextValue {
  user: User | null
  tokens: AuthTokens | null
  isLoggedIn: boolean
  isLoading: boolean
  login: (payload: AuthPayload) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = authStorage.getUser()
    const storedTokens = authStorage.getTokens()

    if (storedUser && storedTokens) {
      setUser(storedUser)
      setTokens(storedTokens)
    }

    setIsLoading(false)
  }, [])

  const login = (payload: AuthPayload) => {
    setUser(payload.user)
    setTokens(payload.tokens)
    authStorage.setUser(payload.user)
    authStorage.setTokens(payload.tokens)
  }

  const logout = () => {
    setUser(null)
    setTokens(null)
    authStorage.clear()

    if (typeof window !== "undefined" && window.Kakao?.Auth) {
      window.Kakao.Auth.logout(() => {
        // Keep logout side-effects inside the SDK callback.
      })
    }
  }

  const value = useMemo(
    () => ({
      user,
      tokens,
      isLoggedIn: Boolean(user && tokens?.accessToken),
      isLoading,
      login,
      logout,
    }),
    [user, tokens, isLoading],
  )

  if (isLoading) {
    return <LoadingSpinner />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth는 AuthProvider 안에서 사용해야 합니다.")
  }
  return context
}
