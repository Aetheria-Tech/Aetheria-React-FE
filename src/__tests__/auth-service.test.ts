const authClientPost = jest.fn()
const authClientGet = jest.fn()
const apiClientPost = jest.fn()
const apiClientDelete = jest.fn()

jest.mock("axios", () => {
  const actual = jest.requireActual("axios")
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      create: jest.fn(() => ({
        post: authClientPost,
        get: authClientGet,
      })),
      isAxiosError: (error: unknown) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
    },
  }
})

jest.mock("@/services/api-client", () => ({
  apiClient: {
    post: apiClientPost,
    delete: apiClientDelete,
  },
}))

import {
  completeOAuthLogin,
  exchangeOAuthCode,
  fetchMyProfile,
  logoutFromServer,
  refreshTokens,
  withdrawMe,
} from "@/services/auth-service"

describe("auth-service", () => {
  beforeEach(() => {
    authClientPost.mockReset()
    authClientGet.mockReset()
    apiClientPost.mockReset()
    apiClientDelete.mockReset()
    localStorage.clear()
  })

  it("refreshes access token using swagger reissue endpoint", async () => {
    authClientPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: "next-access-token",
          expireIn: 3600,
        },
      },
    })

    const tokens = await refreshTokens("legacy-refresh-token")

    expect(authClientPost).toHaveBeenCalledWith("/api/v1/auth/reissue")
    expect(tokens).toEqual({
      accessToken: "next-access-token",
      refreshToken: "legacy-refresh-token",
    })
  })

  it("treats 401 logout response as idempotent success", async () => {
    apiClientPost.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    })

    await expect(logoutFromServer()).resolves.toBeUndefined()
    expect(apiClientPost).toHaveBeenCalledWith("/api/v1/auth/logout")
  })

  it("throws when logout fails for non-401 errors", async () => {
    apiClientPost.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500 },
    })

    await expect(logoutFromServer()).rejects.toBeDefined()
  })

  it("calls withdraw endpoint using swagger contract", async () => {
    apiClientDelete.mockResolvedValue({
      data: {
        success: true,
      },
    })

    await withdrawMe()

    expect(apiClientDelete).toHaveBeenCalledWith("/api/v1/auth/me")
  })

  it("exchanges oauth code with backend callback endpoint", async () => {
    authClientGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: "oauth-access-token",
          expireIn: 3600,
        },
      },
    })

    const data = await exchangeOAuthCode("kakao", "auth-code")

    expect(authClientGet).toHaveBeenCalledWith("/api/v1/auth/callback/kakao", {
      params: { code: "auth-code" },
    })
    expect(data).toEqual({
      accessToken: "oauth-access-token",
      expireIn: 3600,
    })
  })

  it("fetches my profile with authorization header", async () => {
    authClientGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          email: "runner@example.com",
          nickname: "테스터",
          statusMessage: "러닝 테스트",
        },
      },
    })

    const user = await fetchMyProfile("access-token")

    expect(authClientGet).toHaveBeenCalledWith("/api/v1/users/me", {
      headers: { Authorization: "Bearer access-token" },
    })
    expect(user).toEqual({
      id: "runner@example.com",
      name: "테스터",
      email: "runner@example.com",
      profileImage: undefined,
    })
  })

  it("processes oauth json and stores auth data in local storage", async () => {
    authClientGet
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            accessToken: "oauth-access-token",
            expireIn: 3600,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            email: "runner@example.com",
            nickname: "테스터",
          },
        },
      })

    const payload = await completeOAuthLogin("kakao", "auth-code")

    expect(payload).toEqual({
      user: {
        id: "runner@example.com",
        name: "테스터",
        email: "runner@example.com",
        profileImage: undefined,
      },
      tokens: {
        accessToken: "oauth-access-token",
        refreshToken: "cookie",
      },
    })
    expect(localStorage.getItem("auth.tokens")).toContain("oauth-access-token")
    expect(localStorage.getItem("auth.user")).toContain("runner@example.com")
  })
})
