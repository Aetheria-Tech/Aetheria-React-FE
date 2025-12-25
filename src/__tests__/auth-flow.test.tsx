import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import LoginPage from "@/pages/LoginPage"
import { renderWithProviders, mockAuthPayload } from "@/test/test-utils"
import { kakaoLogin } from "@/services/auth-service"

jest.mock("@/services/auth-service", () => ({
  kakaoLogin: jest.fn(),
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
})
