import { decodePolyline, isXmlRouteData, parseRouteCoordinates } from "@/lib/polyline"

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

  it("parses GPX point attributes wrapped with single quotes", () => {
    const originalDOMParser = global.DOMParser
    Object.defineProperty(global, "DOMParser", {
      configurable: true,
      value: undefined,
    })

    const gpx = "<gpx><trk><trkseg><trkpt lat='37.1' lon='127.2' /><trkpt lat='37.2' lon='127.3' /></trkseg></trk></gpx>"

    try {
      expect(parseRouteCoordinates(gpx)).toEqual([
        [37.1, 127.2],
        [37.2, 127.3],
      ])
    } finally {
      Object.defineProperty(global, "DOMParser", {
        configurable: true,
        value: originalDOMParser,
      })
    }
  })
})
