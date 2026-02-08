import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import MyPage from "@/pages/MyPage"
import MyPageDetail from "@/pages/MyPageDetail"
import { renderWithProviders, mockAuthPayload } from "@/test/test-utils"
import { deleteRunningArt, getMyRunningArts, getRunningArtDetail } from "@/services/art-service"

jest.mock("@/services/art-service", () => ({
  createArt: jest.fn(),
  saveArt: jest.fn(),
  fetchMyArts: jest.fn(),
  deleteArt: jest.fn(),
  fetchArtById: jest.fn(),
  updateShareStatus: jest.fn(),
  fetchGalleryArts: jest.fn(),
  getMyRunningArts: jest.fn(),
  getRunningArtDetail: jest.fn(),
  deleteRunningArt: jest.fn(),
  patchRunningArt: jest.fn(),
}))

describe("MyPage", () => {
  it("loads and displays artworks", async () => {
    const arts = [
      {
        id: 1,
        title: "Morning run",
        content: "테스트 러닝 아트",
        shape: "HEART",
        proficiency: "BEGINNER",
        gpx: "_p~iF~ps|U",
        userId: 10,
      },
    ]

    ;(getMyRunningArts as jest.Mock).mockResolvedValue(arts)

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
  })

  it("shows empty state when there are no artworks", async () => {
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("아직 작품이 없습니다.")).toBeInTheDocument()
  })

  it("shows toast when loading artworks fails", async () => {
    ;(getMyRunningArts as jest.Mock).mockRejectedValue(new Error("fail"))

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("작품을 불러오는 데 실패했습니다.")).toBeInTheDocument()
  })

  it("removes artwork after delete", async () => {
    const user = userEvent.setup()
    const arts = [
      {
        id: 1,
        title: "Morning run",
        content: "테스트 러닝 아트",
        shape: "HEART",
        proficiency: "BEGINNER",
        gpx: "_p~iF~ps|U",
        userId: 10,
      },
    ]

    ;(getMyRunningArts as jest.Mock).mockResolvedValue(arts)
    ;(deleteRunningArt as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /삭제/i }))

    await waitFor(() => expect(screen.queryByText("Morning run")).not.toBeInTheDocument())
    expect(deleteRunningArt).toHaveBeenCalledWith(1)
  })

  it("navigates to detail view when clicking an artwork card", async () => {
    const user = userEvent.setup()
    const arts = [
      {
        id: 1,
        title: "Morning run",
        content: "테스트 러닝 아트",
        shape: "HEART",
        proficiency: "BEGINNER",
        gpx: "_p~iF~ps|U",
        userId: 10,
      },
    ]

    ;(getMyRunningArts as jest.Mock).mockResolvedValue(arts)
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(arts[0])

    renderWithProviders(
      <Routes>
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage", auth: mockAuthPayload },
    )

    const link = await screen.findByRole("link", { name: "Morning run" })
    await user.click(link)

    expect(await screen.findByText("작품 상세")).toBeInTheDocument()
    expect(await screen.findByText("Morning run")).toBeInTheDocument()
  })
})
