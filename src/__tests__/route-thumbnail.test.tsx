import { render, screen } from "@testing-library/react"
import RouteThumbnail from "@/components/route-thumbnail"

describe("RouteThumbnail", () => {
  it("renders a route preview from polyline data", () => {
    render(<RouteThumbnail title="Sample route" gpxData="_p~iF~ps|U_ulLnnqC_mqNvxq`@" />)

    expect(screen.getByTestId("route-thumbnail")).toHaveAttribute("data-point-count", "3")
    expect(screen.getByLabelText("Sample route 경로 미리보기")).toBeInTheDocument()
  })

  it("renders a route preview from GPX XML", () => {
    render(
      <RouteThumbnail
        title="XML route"
        gpxData={`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.5665" lon="126.9780"></trkpt>
      <trkpt lat="37.5651" lon="126.9820"></trkpt>
      <trkpt lat="37.5642" lon="126.9865"></trkpt>
    </trkseg>
  </trk>
</gpx>`}
      />,
    )

    expect(screen.getByTestId("route-thumbnail")).toHaveAttribute("data-point-count", "3")
  })
})
