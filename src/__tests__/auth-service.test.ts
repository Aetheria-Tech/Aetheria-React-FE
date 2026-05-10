import axios from "axios"
import { authStorage } from "@/services/auth-storage"
import { completeOAuthLoginWithAccessToken } from "@/services/auth-service"

type MockAxiosClient = jest.Mock & {
  get: jest.Mock
  post: jest.Mock
  patch: jest.Mock
  delete: jest.Mock
  interceptors: {
    request: { use: jest.Mock }
    response: { use: jest.Mock }
  }
}

jest.mock("axios", () => {
  const createClient = () =>
    Object.assign(jest.fn(), {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })

  return {
    __esModule: true,
    default: {
      create: jest.fn(createClient),
    },
    AxiosHeaders: {
      from: jest.fn(() => ({ set: jest.fn() })),
    },
  }
})

const getAuthClient = () => {
  const createResults = (axios.create as jest.Mock).mock.results
  return createResults[createResults.length - 1].value as MockAxiosClient
}

describe("auth-service", () => {
  beforeEach(() => {
    localStorage.clear()
    getAuthClient().get.mockReset()
  })

  it("clears stored auth state when profile loading fails during login", async () => {
    const error = new Error("profile failed")
    const authClient = getAuthClient()
    authClient.get.mockRejectedValue(error)

    authStorage.setTokens({ accessToken: "old-access-token", refreshToken: "cookie" })
    authStorage.setUser({ id: "old-user", name: "old-user", email: "old-user@example.com" })
    localStorage.setItem("isLoggedIn", "true")

    await expect(completeOAuthLoginWithAccessToken("next-access-token")).rejects.toThrow("profile failed")

    expect(authStorage.getTokens()).toBeNull()
    expect(authStorage.getUser()).toBeNull()
    expect(localStorage.getItem("isLoggedIn")).toBeNull()
  })
})
