import type { AxiosHeaders } from "axios"

type RequestConfig = {
  url?: string
  baseURL?: string
  headers?: Record<string, string>
  withCredentials?: boolean
}
type RequestInterceptor = (config: RequestConfig) => unknown
type AuthSessionMock = {
  getStoredAuthTokens: jest.Mock
  refreshCurrentStoredTokens: jest.Mock
}
type AxiosMock = {
  AxiosHeaders: {
    from: jest.Mock
  }
}

let requestInterceptor: RequestInterceptor | null = null

jest.mock("@/services/env", () => ({
  env: {
    apiBaseUrl: "",
  },
}))

jest.mock("@/services/auth-session", () => ({
  getStoredAuthTokens: jest.fn(),
  refreshCurrentStoredTokens: jest.fn(),
}))

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      interceptors: {
        request: {
          use: jest.fn((handler: RequestInterceptor) => {
            requestInterceptor = handler
          }),
        },
        response: {
          use: jest.fn(),
        },
      },
    })),
  },
  AxiosHeaders: {
    from: jest.fn(() => ({ set: jest.fn() })),
  },
}))

describe("apiClient", () => {
  beforeEach(() => {
    jest.resetModules()
    requestInterceptor = null
  })

  it("rejects the request when auth token lookup fails", async () => {
    const error = new Error("token lookup failed")
    const { getStoredAuthTokens } = jest.requireMock("@/services/auth-session") as AuthSessionMock
    getStoredAuthTokens.mockRejectedValue(error)

    await import("@/services/api-client")

    await expect(requestInterceptor?.({ url: "/api/v1/users/me", headers: {} })).rejects.toThrow(
      "API 요청 인증 토큰 확인에 실패했습니다: token lookup failed",
    )
  })

  it("adds the bearer token when auth token lookup succeeds", async () => {
    const setHeader = jest.fn()
    const { getStoredAuthTokens } = jest.requireMock("@/services/auth-session") as AuthSessionMock
    const { AxiosHeaders } = jest.requireMock("axios") as AxiosMock

    getStoredAuthTokens.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "cookie",
    })
    AxiosHeaders.from.mockReturnValue({ set: setHeader } as unknown as AxiosHeaders)

    await import("@/services/api-client")

    const config: RequestConfig = { url: "/api/v1/users/me", headers: {} }
    const result = await requestInterceptor?.(config)

    expect(setHeader).toHaveBeenCalledWith("Authorization", "Bearer access-token")
    expect(config.withCredentials).toBe(true)
    expect(result).toBe(config)
  })

  it("rejects external absolute urls before credentials or auth headers are attached", async () => {
    const { getStoredAuthTokens } = jest.requireMock("@/services/auth-session") as AuthSessionMock
    getStoredAuthTokens.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "cookie",
    })

    await import("@/services/api-client")

    await expect(requestInterceptor?.({ url: "https://dapi.kakao.com/v2/local/search/address.json" })).rejects.toThrow(
      "apiClient는 백엔드 API 경로에만 사용할 수 있습니다.",
    )
    expect(getStoredAuthTokens).not.toHaveBeenCalled()
  })
})
