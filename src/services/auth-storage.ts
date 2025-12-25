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
    return safeParse<AuthTokens>(localStorage.getItem(TOKENS_KEY))
  },
  setUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  setTokens(tokens: AuthTokens) {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
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