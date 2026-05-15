import { StrictMode } from "react"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"
import OAuthCallbackPage from "@/pages/OAuthCallbackPage"
import { completeOAuthLogin, completeOAuthLoginWithAccessToken } from "@/services/auth-service"
import { renderWithProviders } from "@/test/test-utils"

jest.mock("@/services/auth-service", () => ({
  completeOAuthLogin: jest.fn(),
  completeOAuthLoginWithAccessToken: jest.fn(),
}))

const mockedCompleteOAuthLogin = completeOAuthLogin as jest.MockedFunction<typeof completeOAuthLogin>
const mockedCompleteOAuthLoginWithAccessToken = completeOAuthLoginWithAccessToken as jest.MockedFunction<
  typeof completeOAuthLoginWithAccessToken
>

describe("oauth callback page", () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    mockedCompleteOAuthLogin.mockReset()
    mockedCompleteOAuthLoginWithAccessToken.mockReset()
    localStorage.clear()
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    window.history.replaceState({}, "", "/")
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    window.history.replaceState({}, "", "/")
  })

  it("stores auth state and redirects home when the backend redirect passes an access token hash", async () => {
    mockedCompleteOAuthLoginWithAccessToken.mockResolvedValue({
      user: {
        id: "user-1",
        name: "테스트 러너",
        email: "runner@example.com",
      },
      tokens: {
        accessToken: "redirected-access-token",
        refreshToken: "cookie",
      },
    })

    window.history.replaceState({}, "", "/auth/callback/kakao#accessToken=redirected-access-token")

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/" element={<div>메인 페이지</div>} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/auth/callback/kakao" },
    )

    expect(await screen.findByText("메인 페이지")).toBeInTheDocument()
    expect(mockedCompleteOAuthLoginWithAccessToken).toHaveBeenCalledWith("redirected-access-token", "kakao")
    expect(localStorage.getItem("auth.tokens")).toContain("redirected-access-token")
  })

  it("falls back to code exchange when a code query is present", async () => {
    mockedCompleteOAuthLogin.mockResolvedValue({
      user: {
        id: "user-1",
        name: "테스트 러너",
        email: "runner@example.com",
      },
      tokens: {
        accessToken: "oauth-access-token",
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

    expect(await screen.findByText("메인 페이지")).toBeInTheDocument()
    expect(mockedCompleteOAuthLogin).toHaveBeenCalledWith("kakao", "sample-code")
    expect(localStorage.getItem("auth.tokens")).toContain("oauth-access-token")
  })

  it("exchanges the oauth code only once in strict mode", async () => {
    mockedCompleteOAuthLogin.mockResolvedValue({
      user: {
        id: "user-1",
        name: "테스트 러너",
        email: "runner@example.com",
      },
      tokens: {
        accessToken: "oauth-access-token",
        refreshToken: "cookie",
      },
    })

    renderWithProviders(
      <StrictMode>
        <Routes>
          <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
          <Route path="/" element={<div>메인 페이지</div>} />
          <Route path="/login" element={<div>로그인 페이지</div>} />
        </Routes>
      </StrictMode>,
      { route: "/auth/callback/kakao?code=strict-mode-code" },
    )

    expect(await screen.findByText("메인 페이지")).toBeInTheDocument()
    expect(mockedCompleteOAuthLogin).toHaveBeenCalledTimes(1)
    expect(mockedCompleteOAuthLogin).toHaveBeenCalledWith("kakao", "strict-mode-code")
  })

  it("reuses the in-flight oauth completion request across remounts", async () => {
    let resolveLogin: ((value: Awaited<ReturnType<typeof completeOAuthLogin>>) => void) | undefined
    const loginPromise = new Promise<Awaited<ReturnType<typeof completeOAuthLogin>>>((resolve) => {
      resolveLogin = resolve
    })

    mockedCompleteOAuthLogin.mockReturnValue(loginPromise)

    const firstRender = renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/" element={<div>메인 페이지</div>} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/auth/callback/kakao?code=shared-code" },
    )

    await waitFor(() => {
      expect(mockedCompleteOAuthLogin).toHaveBeenCalledTimes(1)
    })

    firstRender.unmount()

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/" element={<div>메인 페이지</div>} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/auth/callback/kakao?code=shared-code" },
    )

    resolveLogin?.({
      user: {
        id: "user-1",
        name: "테스트 러너",
        email: "runner@example.com",
      },
      tokens: {
        accessToken: "shared-access-token",
        refreshToken: "cookie",
      },
    })

    expect(await screen.findByText("메인 페이지")).toBeInTheDocument()
    expect(mockedCompleteOAuthLogin).toHaveBeenCalledTimes(1)
    expect(mockedCompleteOAuthLogin).toHaveBeenCalledWith("kakao", "shared-code")
  })

  it("redirects to login when callback data is missing", async () => {
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
    expect(mockedCompleteOAuthLoginWithAccessToken).not.toHaveBeenCalled()
  })

  it("shows an error message when oauth completion fails", async () => {
    mockedCompleteOAuthLoginWithAccessToken.mockRejectedValue(new Error("oauth-failed"))
    window.history.replaceState({}, "", "/auth/callback/kakao#accessToken=broken-token")

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/" element={<div>메인 페이지</div>} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/auth/callback/kakao" },
    )

    expect(await screen.findByText("로그인 처리 실패")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument()
    expect(screen.queryByText("로그인 페이지")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }))

    await waitFor(() => {
      expect(screen.getByText("로그인 페이지")).toBeInTheDocument()
    })
  })

  it("starts a fresh oauth completion request after a failed attempt", async () => {
    mockedCompleteOAuthLoginWithAccessToken
      .mockRejectedValueOnce(new Error("oauth-failed"))
      .mockResolvedValueOnce({
        user: {
          id: "user-1",
          name: "테스트 러너",
          email: "runner@example.com",
        },
        tokens: {
          accessToken: "retried-access-token",
          refreshToken: "cookie",
        },
      })

    window.history.replaceState({}, "", "/auth/callback/kakao#accessToken=retry-token")

    const firstRender = renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/" element={<div>메인 페이지</div>} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/auth/callback/kakao" },
    )

    expect(await screen.findByText("로그인 처리 실패")).toBeInTheDocument()

    firstRender.unmount()

    renderWithProviders(
      <Routes>
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route path="/" element={<div>메인 페이지</div>} />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/auth/callback/kakao" },
    )

    expect(await screen.findByText("메인 페이지")).toBeInTheDocument()
    expect(mockedCompleteOAuthLoginWithAccessToken).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem("auth.tokens")).toContain("retried-access-token")
  })
})
