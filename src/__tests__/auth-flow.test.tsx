import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import LoginPage from "@/pages/LoginPage"
import { renderWithProviders } from "@/test/test-utils"
import { redirectTo } from "@/lib/navigation"

jest.mock("@/lib/navigation", () => ({
  redirectTo: jest.fn(),
}))

describe("login flow", () => {
  const originalOpen = window.open

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

    await user.click(screen.getByRole("button", { name: /카카오로 로그인/i }))

    expect(window.open).toHaveBeenCalledWith(
      "/api/v1/auth/login/kakao",
      "aetheria-social-login",
      expect.stringContaining("width=520"),
    )
    expect(redirectTo).not.toHaveBeenCalled()
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

    await user.click(screen.getByRole("button", { name: /google로 로그인/i }))

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

    await user.click(screen.getByRole("button", { name: /google로 로그인/i }))

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

    await user.click(screen.getByRole("button", { name: /google로 로그인/i }))

    expect(window.open).toHaveBeenCalledWith(
      "http://myapi.com/api/v1/auth/login/google",
      "aetheria-social-login",
      expect.any(String),
    )
    expect(redirectTo).not.toHaveBeenCalled()
  })
})
