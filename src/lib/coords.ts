export type LatLng = [number, number]

export function normalizeLatLng(lat: number | string, lng: number | string): LatLng | null {
  const normalizedLat = typeof lat === "string" ? Number(lat) : lat
  const normalizedLng = typeof lng === "string" ? Number(lng) : lng

  if (!Number.isFinite(normalizedLat) || !Number.isFinite(normalizedLng)) {
    return null
  }

  return [normalizedLat, normalizedLng]
}

export function toLatLngFromKakao(
  coords: { x: number | string; y: number | string } | null | undefined,
): LatLng | null {
  if (!coords) return null
  return normalizeLatLng(coords.y, coords.x)
}

export function normalizeLatLngTuple(coords: [number | string, number | string] | null | undefined): LatLng | null {
  if (!coords) return null
  return normalizeLatLng(coords[0], coords[1])
}
