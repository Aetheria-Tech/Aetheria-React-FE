import type { AuthTokens } from "@/types/auth"

const REFRESH_BUFFER_MS = 30_000

const decodeJwtPayload = (accessToken: string): Record<string, unknown> | null => {
  const [, payload] = accessToken.split(".")
  if (!payload) return null

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
    const decoded = atob(padded)
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }
}

const resolveExpiresAt = (accessToken: string, expireIn?: number): number | null => {
  if (typeof expireIn === "number" && Number.isFinite(expireIn) && expireIn > 0) {
    if (expireIn > Date.now() - 60_000) {
      return expireIn
    }

    if (expireIn > Math.floor(Date.now() / 1000) - 60_000) {
      return expireIn * 1000
    }

    return Date.now() + expireIn
  }

  const payload = decodeJwtPayload(accessToken)
  const exp = payload?.exp
  if (typeof exp === "number" && Number.isFinite(exp) && exp > 0) {
    return exp * 1000
  }

  return null
}

export const buildAuthTokens = (accessToken: string, refreshToken = "cookie", expireIn?: number): AuthTokens => ({
  accessToken,
  refreshToken,
  expiresAt: resolveExpiresAt(accessToken, expireIn) ?? undefined,
})

export const normalizeAuthTokens = (tokens: AuthTokens): AuthTokens => {
  if (typeof tokens.expiresAt === "number" && Number.isFinite(tokens.expiresAt)) {
    return tokens
  }

  const expiresAt = resolveExpiresAt(tokens.accessToken)
  return expiresAt ? { ...tokens, expiresAt } : tokens
}

export const shouldRefreshAccessToken = (tokens: AuthTokens, now = Date.now()): boolean => {
  if (typeof tokens.expiresAt !== "number" || !Number.isFinite(tokens.expiresAt)) {
    return false
  }

  return tokens.expiresAt - now <= REFRESH_BUFFER_MS
}
