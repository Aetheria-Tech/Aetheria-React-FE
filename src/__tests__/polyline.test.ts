import { decodePolyline, isXmlRouteData } from "@/lib/polyline"

describe("polyline helpers", () => {
  it("decodes a google polyline string into coordinates", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ])
  })

  it("returns an empty array for an empty route string", () => {
    expect(decodePolyline("")).toEqual([])
  })

  it("keeps decoded coordinates when the trailing polyline segment is truncated", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`")).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
    ])
  })

  it("detects xml route payloads", () => {
    expect(isXmlRouteData('<?xml version="1.0"?><gpx></gpx>')).toBe(true)
    expect(isXmlRouteData("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toBe(false)
  })
})
