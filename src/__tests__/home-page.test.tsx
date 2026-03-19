import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import HomePage from "@/pages/HomePage"
import { renderWithProviders, mockAuthPayload } from "@/test/test-utils"
import { authStorage } from "@/services/auth-storage"

describe("HomePage", () => {
  it("shows only login button for unauthenticated users", async () => {
    renderWithProviders(<HomePage />, { auth: null })

    expect(await screen.findByRole("button", { name: "로그인" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "마이페이지" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "갤러리" })).not.toBeInTheDocument()
  })

  it("shows gallery, mypage and logout buttons for authenticated users", async () => {
    renderWithProviders(<HomePage />, { auth: mockAuthPayload })

    expect(await screen.findByRole("link", { name: "갤러리" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "마이페이지" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument()
  })

  it("logs out and navigates home when clicking logout button", async () => {
    const user = userEvent.setup()
    const clearSpy = jest.spyOn(authStorage, "clear")

    renderWithProviders(
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/" element={<div>홈루트</div>} />
      </Routes>,
      { route: "/home", auth: mockAuthPayload },
    )

    await user.click(await screen.findByRole("button", { name: "로그아웃" }))

    await waitFor(() => expect(clearSpy).toHaveBeenCalled())
    expect(await screen.findByText("홈루트")).toBeInTheDocument()
    clearSpy.mockRestore()
  })
})
