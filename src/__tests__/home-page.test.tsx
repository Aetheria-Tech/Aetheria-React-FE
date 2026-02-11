import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import { renderWithProviders, mockAuthPayload } from "@/test/test-utils"
import { authStorage } from "@/services/auth-storage"
import { isDevEnvironment } from "@/lib/runtime"

jest.mock("@/lib/runtime", () => ({
  isDevEnvironment: jest.fn(() => false),
}))

describe("HomePage", () => {
  beforeEach(() => {
    ;(isDevEnvironment as jest.Mock).mockReturnValue(false)
  })

  it("hides logout button for unauthenticated users in non-dev mode", async () => {
    renderWithProviders(<HomePage />, { auth: null })

    await screen.findByRole("button", { name: "마이페이지" })
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument()
  })

  it("shows logout button for authenticated users", async () => {
    renderWithProviders(<HomePage />, { auth: mockAuthPayload })

    expect(await screen.findByRole("button", { name: "로그아웃" })).toBeInTheDocument()
  })

  it("shows logout button for unauthenticated users in dev mode", async () => {
    ;(isDevEnvironment as jest.Mock).mockReturnValue(true)

    renderWithProviders(<HomePage />, { auth: null })

    expect(await screen.findByRole("button", { name: "로그아웃" })).toBeInTheDocument()
  })

  it("logs out and navigates home when clicking logout button", async () => {
    const user = userEvent.setup()
    const clearSpy = jest.spyOn(authStorage, "clear")

    renderWithProviders(
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/" element={<div>홈 루트</div>} />
      </Routes>,
      { route: "/home", auth: mockAuthPayload },
    )

    await user.click(await screen.findByRole("button", { name: "로그아웃" }))

    await waitFor(() => expect(clearSpy).toHaveBeenCalled())
    expect(await screen.findByText("홈 루트")).toBeInTheDocument()
    clearSpy.mockRestore()
  })
})

