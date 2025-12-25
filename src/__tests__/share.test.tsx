import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import MyPageDetail from "@/pages/MyPageDetail"
import SharePage from "@/pages/SharePage"
import ForbiddenPage from "@/pages/ForbiddenPage"
import { renderWithProviders, mockAuthPayload } from "@/test/test-utils"
import { fetchArtById, updateShareStatus } from "@/services/art-service"

jest.mock("@/services/art-service", () => ({
  createArt: jest.fn(),
  saveArt: jest.fn(),
  fetchMyArts: jest.fn(),
  deleteArt: jest.fn(),
  fetchArtById: jest.fn(),
  updateShareStatus: jest.fn(),
  fetchGalleryArts: jest.fn(),
}))

describe("sharing", () => {
  it("updates share status from detail view", async () => {
    const user = userEvent.setup()
    const art = {
      id: "art-1",
      title: "Morning run",
      imageUrl: "/art.png",
      distanceKm: 5,
      theme: "Star",
      isPublic: false,
      createdAt: new Date().toISOString(),
      ownerId: mockAuthPayload.user.id,
    }

    ;(fetchArtById as jest.Mock).mockResolvedValue(art)
    ;(updateShareStatus as jest.Mock).mockResolvedValue({ ...art, isPublic: true })

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage/art-1", auth: mockAuthPayload },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()

    await user.click(screen.getByRole("checkbox"))

    await waitFor(() => expect(updateShareStatus).toHaveBeenCalledWith("art-1", true))
  })

  it("redirects to 403 for private shared artwork", async () => {
    const art = {
      id: "art-2",
      title: "Private run",
      imageUrl: "/private.png",
      distanceKm: 4,
      theme: "Heart",
      isPublic: false,
      createdAt: new Date().toISOString(),
      ownerId: "owner-2",
    }

    ;(fetchArtById as jest.Mock).mockResolvedValue(art)

    renderWithProviders(
      <Routes>
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="/403" element={<ForbiddenPage />} />
      </Routes>,
      { route: "/share/art-2", auth: null },
    )

    expect(await screen.findByText("접근이 거부되었습니다")).toBeInTheDocument()
  })
})
