import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MyPage from "@/pages/MyPage"
import { renderWithProviders, mockAuthPayload } from "@/test/test-utils"
import { deleteArt, fetchMyArts } from "@/services/art-service"

jest.mock("@/services/art-service", () => ({
  createArt: jest.fn(),
  saveArt: jest.fn(),
  fetchMyArts: jest.fn(),
  deleteArt: jest.fn(),
  fetchArtById: jest.fn(),
  updateShareStatus: jest.fn(),
  fetchGalleryArts: jest.fn(),
}))

describe("MyPage", () => {
  it("loads and displays artworks", async () => {
    const arts = [
      {
        id: "art-1",
        title: "Morning run",
        imageUrl: "/art.png",
        distanceKm: 5,
        theme: "Star",
        isPublic: true,
        createdAt: new Date().toISOString(),
        ownerId: "user-1",
      },
    ]

    ;(fetchMyArts as jest.Mock).mockResolvedValue(arts)

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
  })

  it("removes artwork after delete", async () => {
    const user = userEvent.setup()
    const arts = [
      {
        id: "art-1",
        title: "Morning run",
        imageUrl: "/art.png",
        distanceKm: 5,
        theme: "Star",
        isPublic: true,
        createdAt: new Date().toISOString(),
        ownerId: "user-1",
      },
    ]

    ;(fetchMyArts as jest.Mock).mockResolvedValue(arts)
    ;(deleteArt as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /삭제/i }))

    await waitFor(() => expect(screen.queryByText("Morning run")).not.toBeInTheDocument())
    expect(deleteArt).toHaveBeenCalledWith("art-1")
  })
})
