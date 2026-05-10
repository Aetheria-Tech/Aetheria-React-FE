import { normalizeAuthTokens } from "@/services/auth-token"
import type { AuthTokens, User } from "@/types/auth"

const USER_KEY = "auth.user"
const TOKENS_KEY = "auth.tokens"

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export const authStorage = {
  getUser(): User | null {
    return safeParse<User>(localStorage.getItem(USER_KEY))
  },
  getTokens(): AuthTokens | null {
    const tokens = safeParse<AuthTokens>(localStorage.getItem(TOKENS_KEY))
    if (!tokens) return null

    const normalizedTokens = normalizeAuthTokens(tokens)
    if (normalizedTokens.expiresAt !== tokens.expiresAt) {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(normalizedTokens))
    }

    return normalizedTokens
  },
  setUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  setTokens(tokens: AuthTokens) {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(normalizeAuthTokens(tokens)))
  },
  clear() {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKENS_KEY)
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userName")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userProfileImage")
  },
}
