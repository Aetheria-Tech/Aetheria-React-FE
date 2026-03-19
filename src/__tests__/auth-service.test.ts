const authClientPost = jest.fn()
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

import { logoutFromServer, refreshTokens, withdrawMe } from "@/services/auth-service"

describe("auth-service", () => {
  beforeEach(() => {
    authClientPost.mockReset()
    apiClientPost.mockReset()
    apiClientDelete.mockReset()
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
})
