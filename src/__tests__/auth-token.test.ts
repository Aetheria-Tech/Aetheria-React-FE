import { authStorage } from "@/services/auth-storage"
import { buildAuthTokens, shouldRefreshAccessToken } from "@/services/auth-token"

const createJwt = (payload: Record<string, unknown>) => {
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
  return `header.${encodedPayload}.signature`
}

describe("auth token helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("stores expiresAt when the backend returns expireIn as an absolute timestamp", () => {
    const expiresAt = Date.now() + 15 * 60 * 1000

    const tokens = buildAuthTokens("access-token", "cookie", expiresAt)

    expect(tokens.expiresAt).toBe(expiresAt)
  })

  it("derives expiresAt from the JWT exp claim for legacy stored tokens", () => {
    const jwt = createJwt({
      exp: Math.floor((Date.now() + 10 * 60 * 1000) / 1000),
    })

    localStorage.setItem(
      "auth.tokens",
      JSON.stringify({
        accessToken: jwt,
        refreshToken: "cookie",
      }),
    )

    const tokens = authStorage.getTokens()

    expect(tokens?.expiresAt).toBeGreaterThan(Date.now())
    expect(JSON.parse(localStorage.getItem("auth.tokens") ?? "{}")).toHaveProperty("expiresAt")
  })

  it("requests a refresh when the access token is close to expiring", () => {
    expect(
      shouldRefreshAccessToken({
        accessToken: "access-token",
        refreshToken: "cookie",
        expiresAt: Date.now() + 20_000,
      }),
    ).toBe(true)

    expect(
      shouldRefreshAccessToken({
        accessToken: "access-token",
        refreshToken: "cookie",
        expiresAt: Date.now() + 2 * 60 * 1000,
      }),
    ).toBe(false)
  })
})
