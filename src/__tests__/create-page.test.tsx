import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import CreatePage from "@/pages/CreatePage"
import { mockAuthPayload, renderWithProviders } from "@/test/test-utils"
import { useCreateArt } from "@/hooks/use-create-art"
import { searchAddress } from "@/services/kakao-service"

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
  const searchAddressMock = searchAddress as jest.Mock

  beforeEach(() => {
    createArtMock.mockReset()
    searchAddressMock.mockReset()
    searchAddressMock.mockResolvedValue([])
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

    await user.click(screen.getByRole("button", { name: "3km" }))
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

  it("updates route progress as generation options are filled", async () => {
    const user = userEvent.setup()

    renderWithProviders(<CreatePage />, { route: "/create", auth: mockAuthPayload })

    const progress = screen.getByRole("progressbar", { name: "생성 옵션 진행도" })
    expect(progress).toHaveAttribute("aria-valuenow", "0")

    const distanceButton = screen.getByRole("button", { name: "3km" })
    await user.click(distanceButton)
    expect(progress).toHaveAttribute("aria-valuenow", "1")

    await user.click(distanceButton)
    expect(progress).toHaveAttribute("aria-valuenow", "0")
    expect(distanceButton).toHaveAttribute("aria-pressed", "false")

    await user.click(distanceButton)
    expect(progress).toHaveAttribute("aria-valuenow", "1")

    await user.type(screen.getByLabelText("테마"), "하트")
    expect(progress).toHaveAttribute("aria-valuenow", "2")

    await user.type(screen.getByLabelText("출발지"), "서울시청")
    expect(progress).toHaveAttribute("aria-valuenow", "3")
  })
  it("debounces address search while typing a start point", async () => {
    const user = userEvent.setup()

    renderWithProviders(<CreatePage />, { route: "/create", auth: mockAuthPayload })

    const startInput = document.querySelector<HTMLInputElement>("#start_point")
    expect(startInput).not.toBeNull()

    await user.type(startInput!, "seoul")

    expect(searchAddressMock).not.toHaveBeenCalled()
    await waitFor(() => expect(searchAddressMock).toHaveBeenCalledTimes(1), { timeout: 1000 })
    expect(searchAddressMock).toHaveBeenCalledWith("seoul")
  })
})
