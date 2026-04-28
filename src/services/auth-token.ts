import type { AuthTokens } from "@/types/auth"

const REFRESH_BUFFER_MS = 30_000
const RELATIVE_SECONDS_EXPIRE_IN_MAX = 1_000_000

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
    const nowMs = Date.now()
    const nowSeconds = Math.floor(nowMs / 1000)

    if (expireIn > nowMs - 60_000) {
      return expireIn
    }

    if (expireIn > nowSeconds - 60) {
      return expireIn * 1000
    }

    // 백엔드/OAuth의 expires_in은 일반적으로 초 단위이므로 짧은 상대 시간은 초로 해석한다.
    const relativeMs = expireIn < RELATIVE_SECONDS_EXPIRE_IN_MAX ? expireIn * 1000 : expireIn
    return nowMs + relativeMs
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
