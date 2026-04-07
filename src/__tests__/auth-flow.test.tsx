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
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    delete process.env.VITE_GOOGLE_LOGIN_URL
    delete process.env.VITE_API_BASE_URL
    jest.clearAllMocks()
  })

  it("redirects to Kakao login URL when clicking the button", async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: /카카오로 로그인/i }))

    expect(redirectTo).toHaveBeenCalledWith("/api/v1/auth/login/kakao")
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

  it("falls back to the default Kakao login path when env is missing", async () => {
    const user = userEvent.setup()
    delete process.env.VITE_API_BASE_URL

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: /카카오로 로그인/i }))

    expect(redirectTo).toHaveBeenCalledWith("/api/v1/auth/login/kakao")
  })

  it("builds a safe Google login URL when VITE_API_BASE_URL includes /api", async () => {
    const user = userEvent.setup()
    delete process.env.VITE_GOOGLE_LOGIN_URL
    process.env.VITE_API_BASE_URL = "http://myapi.com/api"

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: /google로 로그인/i }))

    expect(redirectTo).toHaveBeenCalledWith("http://myapi.com/api/v1/auth/login/google")
  })

  it("builds a safe Kakao login URL when VITE_API_BASE_URL includes /api", async () => {
    const user = userEvent.setup()
    process.env.VITE_API_BASE_URL = "http://myapi.com/api"

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: "/login" },
    )

    await user.click(screen.getByRole("button", { name: /카카오로 로그인/i }))

    expect(redirectTo).toHaveBeenCalledWith("http://myapi.com/api/v1/auth/login/kakao")
  })
})
