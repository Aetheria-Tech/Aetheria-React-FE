import { act, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import { useAuth } from "@/context/auth-context"
import { redirectTo } from "@/lib/navigation"
import LoginPage from "@/pages/LoginPage"
import { renderWithProviders } from "@/test/test-utils"

jest.mock("@/lib/navigation", () => ({
  redirectTo: jest.fn(),
}))

const HomeProbe = () => {
  const { isLoggedIn } = useAuth()
  return <div>{isLoggedIn ? "메인 페이지" : "비로그인"}</div>
}

describe("login flow", () => {
  const originalOpen = window.open

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    delete process.env.VITE_GOOGLE_LOGIN_URL
    delete process.env.VITE_API_BASE_URL
    window.open = originalOpen
    jest.clearAllMocks()
  })

  it("opens popup with Kakao login endpoint when clicking the button", async () => {
    const user = userEvent.setup()
    delete process.env.VITE_API_BASE_URL
    window.open = jest.fn(() => ({ closed: false } as unknown as Window))

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: "카카오로 로그인" }))

    expect(window.open).toHaveBeenCalledWith(
      "/api/v1/auth/login/kakao",
      "aetheria-social-login",
      expect.stringContaining("width=520"),
    )
    expect(redirectTo).not.toHaveBeenCalled()
  })

  it("updates auth state after receiving a success message from the popup", async () => {
    const user = userEvent.setup()
    const popupClose = jest.fn()
    const popup = { closed: false, close: popupClose } as unknown as Window
    window.open = jest.fn(() => popup)

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeProbe />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: "카카오로 로그인" }))

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          data: {
            type: "AETHERIA_OAUTH_SUCCESS",
            payload: {
              user: {
                id: "user-1",
                name: "테스트 러너",
                email: "runner@example.com",
              },
              tokens: {
                accessToken: "popup-access-token",
                refreshToken: "cookie",
              },
            },
          },
        }),
      )
    })

    expect(await screen.findByText("메인 페이지")).toBeInTheDocument()
    expect(localStorage.getItem("auth.tokens")).toContain("popup-access-token")
    expect(popupClose).toHaveBeenCalled()
  })

  it("opens popup with Google login URL when env is provided", async () => {
    const user = userEvent.setup()
    process.env.VITE_GOOGLE_LOGIN_URL = "https://example.com/auth/google"
    window.open = jest.fn(() => ({ closed: false } as unknown as Window))

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: "Google로 로그인" }))

    expect(window.open).toHaveBeenCalledWith(
      "https://example.com/auth/google",
      "aetheria-social-login",
      expect.any(String),
    )
    expect(redirectTo).not.toHaveBeenCalled()
  })

  it("falls back to full redirect when popup is blocked", async () => {
    const user = userEvent.setup()
    delete process.env.VITE_GOOGLE_LOGIN_URL
    delete process.env.VITE_API_BASE_URL
    window.open = jest.fn(() => null)

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: "Google로 로그인" }))

    expect(window.open).toHaveBeenCalled()
    expect(redirectTo).toHaveBeenCalledWith("/api/v1/auth/login/google")
  })

  it("builds a safe provider login URL when VITE_API_BASE_URL includes /api", async () => {
    const user = userEvent.setup()
    delete process.env.VITE_GOOGLE_LOGIN_URL
    process.env.VITE_API_BASE_URL = "http://myapi.com/api"
    window.open = jest.fn(() => ({ closed: false } as unknown as Window))

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: "Google로 로그인" }))

    expect(window.open).toHaveBeenCalledWith(
      "http://myapi.com/api/v1/auth/login/google",
      "aetheria-social-login",
      expect.any(String),
    )
    expect(redirectTo).not.toHaveBeenCalled()
  })
})
