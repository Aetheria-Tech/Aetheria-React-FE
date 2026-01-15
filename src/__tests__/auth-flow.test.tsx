import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import LoginPage from "@/pages/LoginPage"
import { renderWithProviders, mockAuthPayload } from "@/test/test-utils"
import { kakaoLogin } from "@/services/auth-service"
import { redirectTo } from "@/lib/navigation"

jest.mock("@/services/auth-service", () => ({
  kakaoLogin: jest.fn(),
}))

jest.mock("@/lib/navigation", () => ({
  redirectTo: jest.fn(),
}))

describe("login flow", () => {
  beforeEach(() => {
    localStorage.clear()
    process.env.VITE_KAKAO_JS_KEY = "test-key"
    window.Kakao = {
      isInitialized: () => true,
      init: jest.fn(),
      Auth: {
        login: jest.fn(),
        logout: jest.fn(),
      },
    }
  })

  afterEach(() => {
    delete window.Kakao
    delete process.env.VITE_GOOGLE_LOGIN_URL
    delete process.env.VITE_API_BASE_URL
    jest.clearAllMocks()
  })

  it("stores auth payload after Kakao login", async () => {
    const user = userEvent.setup()
    ;(window.Kakao?.Auth.login as jest.Mock).mockImplementation(({ success }) =>
      success({ access_token: "kakao-token" }),
    )
    ;(kakaoLogin as jest.Mock).mockResolvedValue(mockAuthPayload)

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mypage" element={<div>마이페이지</div>} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: /카카오로 로그인/i }))

    expect(kakaoLogin).toHaveBeenCalledWith("kakao-token")
    expect(await screen.findByText("마이페이지")).toBeInTheDocument()
    expect(localStorage.getItem("auth.user")).toBeTruthy()
  })

  it("redirects to Google login URL when clicking the button", async () => {
    const user = userEvent.setup()
    process.env.VITE_GOOGLE_LOGIN_URL = "https://example.com/auth/google"

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: /google로 로그인/i }))

    expect(redirectTo).toHaveBeenCalledWith("https://example.com/auth/google")
  })

  it("falls back to the default Google login path when env is missing", async () => {
    const user = userEvent.setup()
    delete process.env.VITE_GOOGLE_LOGIN_URL
    delete process.env.VITE_API_BASE_URL

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: /google로 로그인/i }))

    expect(redirectTo).toHaveBeenCalledWith("/api/v1/auth/login/google")
  })
})
