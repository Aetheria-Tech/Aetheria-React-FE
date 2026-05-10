import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import CreatePage from "@/pages/CreatePage"
import { mockAuthPayload, renderWithProviders } from "@/test/test-utils"
import { useCreateArt } from "@/hooks/use-create-art"

jest.mock("@/hooks/use-create-art", () => ({
  useCreateArt: jest.fn(),
}))

jest.mock("@/services/kakao-service", () => ({
  searchAddress: jest.fn().mockResolvedValue([]),
}))

jest.mock("@/mocks/geocode-map", () => ({
  saveStoredGeocode: jest.fn(),
}))

describe("CreatePage", () => {
  const createArtMock = jest.fn()

  beforeEach(() => {
    createArtMock.mockReset()
    ;(useCreateArt as jest.Mock).mockReturnValue({
      createArt: createArtMock,
      isLoading: false,
    })

    Object.defineProperty(window, "daum", {
      writable: true,
      value: {
        Postcode: jest.fn(() => ({
          open: jest.fn(),
        })),
      },
    })

    HTMLElement.prototype.hasPointerCapture = jest.fn()
    HTMLElement.prototype.setPointerCapture = jest.fn()
    HTMLElement.prototype.releasePointerCapture = jest.fn()
    HTMLElement.prototype.scrollIntoView = jest.fn()
  })

  it("navigates to the generating page after a successful create request", async () => {
    const user = userEvent.setup()
    createArtMock.mockResolvedValue({ taskId: "task-1" })

    renderWithProviders(
      <Routes>
        <Route path="/create" element={<CreatePage />} />
        <Route path="/mypage/tasks/:taskId" element={<div>생성 상태 페이지</div>} />
      </Routes>,
      { route: "/create", auth: mockAuthPayload },
    )

    await user.click(screen.getByRole("combobox"))
    await user.click(screen.getByText("입문 (3km)"))
    await user.type(screen.getByLabelText("테마"), "하트")
    await user.type(screen.getByLabelText("출발지"), "서울시청")
    await user.click(screen.getByRole("button", { name: "작품 생성" }))

    await waitFor(() =>
      expect(createArtMock).toHaveBeenCalledWith({
        startPosition: "서울시청",
        shape: "하트",
        proficiency: "INTRODUCTION",
      }),
    )
    expect(await screen.findByText("생성 상태 페이지")).toBeInTheDocument()
  })
})
