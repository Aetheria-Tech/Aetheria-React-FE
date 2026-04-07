export type RouteCoordinate = [number, number]

export function isXmlRouteData(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.startsWith("<?xml") || trimmed.startsWith("<gpx") || trimmed.startsWith("<")
}

export function parseRouteCoordinates(value: string): RouteCoordinate[] {
  const trimmed = value.trim()

  if (!trimmed) {
    return []
  }

  if (isXmlRouteData(trimmed)) {
    return parseXmlRouteData(trimmed)
  }

  return decodePolyline(trimmed)
}

export function decodePolyline(encoded: string): RouteCoordinate[] {
  const value = encoded.trim()

  if (!value) {
    return []
  }

  let index = 0
  let latitude = 0
  let longitude = 0
  const coordinates: RouteCoordinate[] = []

  while (index < value.length) {
    let latitudeDelta: number
    let longitudeDelta: number

    try {
      latitudeDelta = decodeNextValue(value, () => index++)
      longitudeDelta = decodeNextValue(value, () => index++)
    } catch (error) {
      // 외부 sample 데이터 말단이 일부 손상돼도 앞에서 해석된 경로는 지도에 유지한다.
      if (coordinates.length >= 2) {
        break
      }
      throw error
    }

    latitude += latitudeDelta
    longitude += longitudeDelta
    coordinates.push([latitude / 1e5, longitude / 1e5])
  }

  return coordinates
}

function decodeNextValue(encoded: string, advance: () => number): number {
  let shift = 0
  let result = 0
  let byte = 0

  do {
    const currentIndex = advance()

    if (currentIndex >= encoded.length) {
      throw new Error("Invalid polyline data")
    }

    byte = encoded.charCodeAt(currentIndex) - 63
    result |= (byte & 0x1f) << shift
    shift += 5
  } while (byte >= 0x20)

  return (result & 1) !== 0 ? ~(result >> 1) : result >> 1
}

function parseXmlRouteData(xml: string): RouteCoordinate[] {
  const parsedWithDom = parseXmlWithDom(xml)
  if (parsedWithDom.length >= 2) {
    return parsedWithDom
  }

  return parseXmlWithRegex(xml)
}

function parseXmlWithDom(xml: string): RouteCoordinate[] {
  if (typeof DOMParser === "undefined") {
    return []
  }

  try {
    const document = new DOMParser().parseFromString(xml, "application/xml")
    const pointElements = Array.from(document.querySelectorAll("trkpt, rtept"))

    return pointElements
      .map((point) => {
        const latitude = Number(point.getAttribute("lat"))
        const longitude = Number(point.getAttribute("lon"))

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null
        }

        return [latitude, longitude] as RouteCoordinate
      })
      .filter((point): point is RouteCoordinate => point !== null)
  } catch {
    return []
  }
}

function parseXmlWithRegex(xml: string): RouteCoordinate[] {
  const coordinates: RouteCoordinate[] = []
  const pointPattern = /<(?:trkpt|rtept)\b([^>]*)>/gi

  for (const match of xml.matchAll(pointPattern)) {
    const attributes = match[1] ?? ""
    const latitude = extractNumericAttribute(attributes, "lat")
    const longitude = extractNumericAttribute(attributes, "lon")

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue
    }

    coordinates.push([latitude, longitude])
  }

  return coordinates
}

function extractNumericAttribute(attributes: string, name: string): number {
  const match = attributes.match(new RegExp(`${name}="([^"]+)"`, "i"))
  return match ? Number(match[1]) : Number.NaN
}
