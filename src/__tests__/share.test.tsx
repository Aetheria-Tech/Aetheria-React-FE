import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"
import MyPageDetail from "@/pages/MyPageDetail"
import SharePage from "@/pages/SharePage"
import { renderWithProviders } from "@/test/test-utils"
import { getRunningArtDetail } from "@/services/art-service"

jest.mock("@/services/art-service", () => ({
  getRunningArtDetail: jest.fn(),
  deleteRunningArt: jest.fn(),
  patchRunningArt: jest.fn(),
}))

describe("sharing", () => {
  it("does not render share controls in detail view because backend does not expose sharing APIs", async () => {
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue({
      id: 1,
      title: "Morning run",
      content: "테스트 러닝 아트",
      shape: "HEART",
      proficiency: "BEGINNER",
      gpx: "_p~iF~ps|U",
      userId: 10,
    })

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage/1", auth: { user: { id: "owner@example.com", name: "Owner", email: "owner@example.com" }, tokens: { accessToken: "access-token", refreshToken: "refresh-token" } } },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.queryByText("공개 공유")).not.toBeInTheDocument()
  })

  it("shows an unsupported message for legacy share URLs", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/share/:id" element={<SharePage />} />
      </Routes>,
      { route: "/share/2", auth: null },
    )

    expect(await screen.findByText("공유 기능 미지원")).toBeInTheDocument()
    expect(screen.getByText("현재 백엔드 API 계약에는 공개 공유 조회와 공개 상태 변경 기능이 없습니다.")).toBeInTheDocument()
  })
})
