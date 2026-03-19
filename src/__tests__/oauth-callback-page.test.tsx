import { screen, waitFor } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"
import OAuthCallbackPage from "@/pages/OAuthCallbackPage"
import { renderWithProviders } from "@/test/test-utils"
import { completeOAuthLogin } from "@/services/auth-service"

jest.mock("@/services/auth-service", () => ({
  completeOAuthLogin: jest.fn(),
}))

const mockedCompleteOAuthLogin = completeOAuthLogin as jest.MockedFunction<typeof completeOAuthLogin>

describe("oauth callback page", () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    mockedCompleteOAuthLogin.mockReset()
    localStorage.clear()
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it("stores auth state and redirects to home after successful callback", async () => {
    mockedCompleteOAuthLogin.mockResolvedValue({
      user: {
        id: "user-1",
        name: "테스터",
        email: "runner@example.com",
      },
      tokens: {
        accessToken: "access-token",
        refreshToken: "cookie",
      },
    })

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/" element={<div>메인 페이지</div>} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/auth/callback/kakao?code=sample-code" },
    )

    await screen.findByText("메인 페이지")

    expect(mockedCompleteOAuthLogin).toHaveBeenCalledWith("kakao", "sample-code")
    expect(localStorage.getItem("auth.tokens")).toContain("access-token")
  })

  it("redirects to login when callback fails", async () => {
    mockedCompleteOAuthLogin.mockRejectedValue(new Error("oauth-failed"))

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/" element={<div>메인 페이지</div>} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/auth/callback/kakao?code=broken" },
    )

    await screen.findByText("로그인 페이지")
  })

  it("redirects to login when code is missing", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/auth/callback/kakao" },
    )

    await waitFor(() => {
      expect(screen.getByText("로그인 페이지")).toBeInTheDocument()
    })
    expect(mockedCompleteOAuthLogin).not.toHaveBeenCalled()
  })
})
