import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import MyPageDetail from "@/pages/MyPageDetail"
import SharePage from "@/pages/SharePage"
import ForbiddenPage from "@/pages/ForbiddenPage"
import { renderWithProviders } from "@/test/test-utils"
import { getRunningArtDetail, updateShareStatus } from "@/services/art-service"

jest.mock("@/lib/runtime", () => ({
  isDevEnvironment: jest.fn(() => false),
}))

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

describe("sharing", () => {
  it("updates share status from detail view", async () => {
    const user = userEvent.setup()
    const auth = {
      user: {
        id: "10",
        name: "Owner",
        email: "owner@example.com",
      },
      tokens: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
      },
    }
    const art = {
      id: 1,
      title: "Morning run",
      content: "테스트 러닝 아트",
      shape: "HEART",
      proficiency: "BEGINNER",
      gpx: "_p~iF~ps|U",
      userId: 10,
    }

    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(art)
    ;(updateShareStatus as jest.Mock).mockImplementation((_artId: string, isPublic: boolean) =>
      Promise.resolve({
        id: "1",
        title: art.title,
        content: art.content,
        imageUrl: "/placeholder.svg",
        distanceKm: 0,
        theme: art.shape,
        isPublic,
        createdAt: "",
        ownerId: String(art.userId),
        gpxData: art.gpx,
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage/1", auth },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()

    const checkbox = screen.getByRole("checkbox")
    await user.click(checkbox)

    await waitFor(() => expect(checkbox).toBeChecked())
    expect(await screen.findByText("작품이 공개로 전환되었습니다.")).toBeInTheDocument()
  })

  it("redirects to 403 for private shared artwork", async () => {
    const art = {
      id: 2,
      title: "Private run",
      content: "비공개 테스트",
      shape: "STAR",
      proficiency: "BEGINNER",
      gpx: "_p~iF~ps|U",
      userId: 99,
    }

    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(art)

    renderWithProviders(
      <Routes>
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="/403" element={<ForbiddenPage />} />
      </Routes>,
      { route: "/share/2", auth: null },
    )

    expect(await screen.findByText("접근이 거부되었습니다")).toBeInTheDocument()
  })
})
