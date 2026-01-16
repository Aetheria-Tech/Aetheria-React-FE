import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CreatePage from "@/pages/CreatePage"
import { renderWithProviders, mockAuthPayload } from "@/test/test-utils"
import { createArt } from "@/services/art-service"
import { searchAddress, addressToCoords } from "@/services/kakao-service"

jest.mock("@/components/map-component", () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="map" />),
}))

jest.mock("@/components/ui/select", () => {
  const React = require("react")
  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  )

  const collectItems = (children: React.ReactNode, items: Array<{ value: string; label: React.ReactNode }> = []) => {
    React.Children.forEach(children, (child: any) => {
      if (!React.isValidElement(child)) return
      if (child.type === SelectItem) {
        items.push({ value: child.props.value, label: child.props.children })
        return
      }
      if (child.props?.children) {
        collectItems(child.props.children, items)
      }
    })
    return items
  }

  const Select = ({ value, onValueChange, children }: any) => {
    const items = collectItems(children)
    return (
      <select
        data-testid="distance-select"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        <option value="">거리 선택</option>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    )
  }

  const SelectTrigger = ({ children }: any) => <>{children}</>
  const SelectValue = () => null
  const SelectContent = ({ children }: any) => <>{children}</>

  return {
    __esModule: true,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  }
})

jest.mock("@/services/art-service", () => ({
  createArt: jest.fn(),
  saveArt: jest.fn(),
  fetchMyArts: jest.fn(),
  deleteArt: jest.fn(),
  fetchArtById: jest.fn(),
  updateShareStatus: jest.fn(),
  fetchGalleryArts: jest.fn(),
}))

jest.mock("@/services/kakao-service", () => ({
  searchAddress: jest.fn(),
  addressToCoords: jest.fn(),
  coordsToAddress: jest.fn(),
}))

describe("CreatePage", () => {
  beforeEach(() => {
    localStorage.clear()
    window.daum = {
      Postcode: jest.fn().mockImplementation(() => ({ open: jest.fn() })),
    }
  })

  afterEach(() => {
    delete window.daum
    jest.clearAllMocks()
  })

  it("renders required form fields", () => {
    renderWithProviders(<CreatePage />, { auth: mockAuthPayload })

    expect(screen.getByTestId("distance-select")).toBeInTheDocument()
    expect(screen.getByLabelText("테마")).toBeInTheDocument()
    expect(screen.getByLabelText("출발지")).toBeInTheDocument()
    expect(screen.getByLabelText("도착지")).toBeInTheDocument()
  })

  it("normalizes coords and passes lat/lng order to the map", async () => {
    const user = userEvent.setup()
    const startResult = { addressName: "서울시청", x: "126.977", y: "37.566" } as unknown as {
      addressName: string
      x: number
      y: number
    }
    const endResult = { addressName: "남산공원", x: "126.99", y: "37.55" } as unknown as {
      addressName: string
      x: number
      y: number
    }

    ;(searchAddress as jest.Mock).mockResolvedValue([startResult, endResult])
    const mapComponentMock = jest.requireMock("@/components/map-component").default as jest.Mock

    renderWithProviders(<CreatePage />, { auth: mockAuthPayload })

    await user.type(screen.getByLabelText("출발지"), "서울")
    await user.click(await screen.findByText("서울시청"))

    await user.type(screen.getByLabelText("도착지"), "남산")
    await user.click(await screen.findByText("남산공원"))

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /지도에 표시/i }))
    })

    await waitFor(() => {
      const lastCall = mapComponentMock.mock.calls.at(-1)
      const lastProps = lastCall?.[0]

      expect(lastProps?.startCoords).toEqual([37.566, 126.977])
      expect(lastProps?.endCoords).toEqual([37.55, 126.99])
      expect(typeof lastProps?.startCoords?.[0]).toBe("number")
      expect(typeof lastProps?.startCoords?.[1]).toBe("number")
      expect(typeof lastProps?.endCoords?.[0]).toBe("number")
      expect(typeof lastProps?.endCoords?.[1]).toBe("number")
    })
  })

  it("updates markers when selecting an address from the popup", async () => {
    const user = userEvent.setup()
    let oncomplete: ((data: { address: string }) => void) | null = null

    window.daum = {
      Postcode: jest.fn().mockImplementation((options: { oncomplete: (data: { address: string }) => void }) => {
        oncomplete = options.oncomplete
        return { open: jest.fn() }
      }),
    }

    ;(addressToCoords as jest.Mock).mockResolvedValue({ addressName: "서울시청", x: "126.977", y: "37.566" })

    renderWithProviders(<CreatePage />, { auth: mockAuthPayload })

    await user.click(screen.getByLabelText("출발지"))

    await act(async () => {
      oncomplete?.({ address: "서울시청" })
    })

    const mapComponentMock = jest.requireMock("@/components/map-component").default as jest.Mock

    await waitFor(() => {
      const lastProps = mapComponentMock.mock.calls.at(-1)?.[0]
      expect(lastProps?.startCoords).toEqual([37.566, 126.977])
    })
  })

  it("searches addresses and generates artwork", async () => {
    const user = userEvent.setup()
    const startResult = { addressName: "서울시청", x: 126.977, y: 37.566 }
    const endResult = { addressName: "남산공원", x: 126.99, y: 37.55 }

    ;(searchAddress as jest.Mock).mockResolvedValue([startResult, endResult])
    ;(createArt as jest.Mock).mockResolvedValue({
      art: {
        id: "art-1",
        title: "Test art",
        imageUrl: "/generated.png",
        distanceKm: 3,
        theme: "하트",
        isPublic: false,
        createdAt: new Date().toISOString(),
        ownerId: "user-1",
      },
      gpxData: "gpx-data",
      imageUrl: "/generated.png",
    })
    ;(addressToCoords as jest.Mock).mockResolvedValue(startResult)

    renderWithProviders(<CreatePage />, { auth: mockAuthPayload })

    await user.selectOptions(screen.getByTestId("distance-select"), "beginner")
    await user.type(screen.getByLabelText("테마"), "하트")

    await user.type(screen.getByLabelText("출발지"), "서울")
    await user.click(await screen.findByText("서울시청"))

    await user.type(screen.getByLabelText("도착지"), "남산")
    await user.click(await screen.findByText("남산공원"))

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /작품 생성/i }))
    })

    await waitFor(() =>
      expect(createArt).toHaveBeenCalledWith({
        distanceKm: 3,
        theme: "하트",
        startAddress: "서울시청",
        endAddress: "남산공원",
        startCoords: { lat: 37.566, lng: 126.977 },
        endCoords: { lat: 37.55, lng: 126.99 },
      }),
    )

    expect(await screen.findByText("생성된 작품")).toBeInTheDocument()
  })

  it("shows loading state while generating", async () => {
    const user = userEvent.setup()
    const startResult = { addressName: "서울시청", x: 126.977, y: 37.566 }
    const endResult = { addressName: "남산공원", x: 126.99, y: 37.55 }

    ;(searchAddress as jest.Mock).mockResolvedValue([startResult, endResult])

    let resolvePromise: (value: unknown) => void = () => undefined
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    ;(createArt as jest.Mock).mockReturnValue(pendingPromise)

    renderWithProviders(<CreatePage />, { auth: mockAuthPayload })

    await user.selectOptions(screen.getByTestId("distance-select"), "beginner")
    await user.type(screen.getByLabelText("테마"), "하트")
    await user.type(screen.getByLabelText("출발지"), "서울")
    await user.click(await screen.findByText("서울시청"))
    await user.type(screen.getByLabelText("도착지"), "남산")
    await user.click(await screen.findByText("남산공원"))

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /작품 생성/i }))
    })

    expect(await screen.findByText("생성 중...")).toBeInTheDocument()

    await act(async () => {
      resolvePromise({
        art: {
          id: "art-1",
          title: "Test art",
          imageUrl: "/generated.png",
          distanceKm: 3,
          theme: "하트",
          isPublic: false,
          createdAt: new Date().toISOString(),
          ownerId: "user-1",
        },
        gpxData: "gpx-data",
        imageUrl: "/generated.png",
      })
    })
  })

  it("shows toast on generation failure", async () => {
    const user = userEvent.setup()
    const startResult = { addressName: "서울시청", x: 126.977, y: 37.566 }
    const endResult = { addressName: "남산공원", x: 126.99, y: 37.55 }

    ;(searchAddress as jest.Mock).mockResolvedValue([startResult, endResult])
    ;(createArt as jest.Mock).mockRejectedValue(new Error("fail"))

    renderWithProviders(<CreatePage />, { auth: mockAuthPayload })

    await user.selectOptions(screen.getByTestId("distance-select"), "beginner")
    await user.type(screen.getByLabelText("테마"), "하트")
    await user.type(screen.getByLabelText("출발지"), "서울")
    await user.click(await screen.findByText("서울시청"))
    await user.type(screen.getByLabelText("도착지"), "남산")
    await user.click(await screen.findByText("남산공원"))

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /작품 생성/i }))
    })

    expect(await screen.findByText("작품 생성에 실패했습니다. 다시 시도해 주세요.")).toBeInTheDocument()
  })
})
