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

const getCreateFormInputs = (container: HTMLElement) => {
  const startInput = container.querySelector<HTMLInputElement>("#start_point")
  const themeInput = container.querySelector<HTMLInputElement>("#theme")

  if (!startInput || !themeInput) {
    throw new Error("Create form inputs were not rendered.")
  }

  return { startInput, themeInput }
}

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

    const { container } = renderWithProviders(
      <Routes>
        <Route path="/create" element={<CreatePage />} />
        <Route path="/mypage/tasks/:taskId" element={<div>generation status page</div>} />
      </Routes>,
      { route: "/create", auth: mockAuthPayload },
    )
    const { startInput, themeInput } = getCreateFormInputs(container)

    await user.click(screen.getByRole("button", { name: "3km" }))
    await user.type(themeInput, "Heart")
    await user.type(startInput, "Seoul")

    const buttons = screen.getAllByRole("button")
    const createButton = buttons[buttons.length - 1]
    if (!createButton) {
      throw new Error("Create button was not rendered.")
    }
    await user.click(createButton)

    await waitFor(() =>
      expect(createArtMock).toHaveBeenCalledWith({
        startPosition: "Seoul",
        shape: "Heart",
        proficiency: "INTRODUCTION",
      }),
    )
    expect(await screen.findByText("generation status page")).toBeInTheDocument()
  })

  it("updates route progress as generation options are filled", async () => {
    const user = userEvent.setup()

    const { container } = renderWithProviders(<CreatePage />, { route: "/create", auth: mockAuthPayload })
    const { startInput, themeInput } = getCreateFormInputs(container)

    const progress = screen.getByRole("progressbar")
    expect(progress).toHaveAttribute("aria-valuenow", "0")

    const distanceButton = screen.getByRole("button", { name: "3km" })
    await user.click(distanceButton)
    expect(progress).toHaveAttribute("aria-valuenow", "1")

    await user.click(distanceButton)
    expect(progress).toHaveAttribute("aria-valuenow", "0")
    expect(distanceButton).toHaveAttribute("aria-pressed", "false")

    await user.click(distanceButton)
    expect(progress).toHaveAttribute("aria-valuenow", "1")

    await user.type(themeInput, "Heart")
    expect(progress).toHaveAttribute("aria-valuenow", "2")

    await user.type(startInput, "Seoul")
    expect(progress).toHaveAttribute("aria-valuenow", "3")
  })

  it("orders route progress labels by input sequence", async () => {
    const user = userEvent.setup()

    const { container } = renderWithProviders(<CreatePage />, { route: "/create", auth: mockAuthPayload })
    const { startInput, themeInput } = getCreateFormInputs(container)

    const progress = screen.getByRole("progressbar")

    await user.type(startInput, "Seoul")
    await waitFor(() => expect(progress).toHaveTextContent("Seoul"))

    await user.click(screen.getByRole("button", { name: "10km" }))
    await waitFor(() => expect(progress).toHaveTextContent("10km"))

    await user.type(themeInput, "Star")
    await waitFor(() => expect(progress).toHaveTextContent("Star"))

    let progressText = progress.textContent ?? ""
    expect(progressText.indexOf("Seoul")).toBeLessThan(progressText.indexOf("10km"))
    expect(progressText.indexOf("10km")).toBeLessThan(progressText.indexOf("Star"))

    await user.clear(startInput)
    await waitFor(() => expect(progress).not.toHaveTextContent("Seoul"))

    progressText = progress.textContent ?? ""
    expect(progressText.indexOf("10km")).toBeLessThan(progressText.indexOf("Star"))
  })
})
