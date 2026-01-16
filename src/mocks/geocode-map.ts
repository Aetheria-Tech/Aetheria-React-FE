// Dev-only local geocode map; replace with backend geocode when available.
export type LocalGeocodeEntry = {
  keyword: string
  latitude: number
  longitude: number
  formattedAddress: string
}

export const localGeocodeMap: LocalGeocodeEntry[] = [
  {
    keyword: "경기 수원시 장안구 정조로 1087",
    latitude: 37.2691349,
    longitude: 127.0168867,
    formattedAddress: "경기 수원시 장안구 정조로 1087",
  },
  {
    keyword: "수원",
    latitude: 37.2635,
    longitude: 127.0286,
    formattedAddress: "경기 수원시",
  },
  {
    keyword: "서울시청",
    latitude: 37.5665,
    longitude: 126.978,
    formattedAddress: "서울특별시 중구 세종대로 110",
  },
  {
    keyword: "남산공원",
    latitude: 37.5512,
    longitude: 126.9895,
    formattedAddress: "서울특별시 중구 남산공원길",
  },
  {
    keyword: "광화문",
    latitude: 37.5759,
    longitude: 126.9769,
    formattedAddress: "서울특별시 종로구 세종대로 175",
  },
  {
    keyword: "한강공원",
    latitude: 37.528,
    longitude: 126.95,
    formattedAddress: "서울특별시 영등포구 여의동로 330",
  },
]

const normalize = (value: string) => value.trim()

export const findLocalGeocode = (address: string): LocalGeocodeEntry | null => {
  const normalized = normalize(address)
  if (!normalized) return null

  const exact = localGeocodeMap.find(
    (item) => item.keyword === normalized || item.formattedAddress === normalized,
  )
  if (exact) return exact

  return localGeocodeMap.find((item) => normalized.includes(item.keyword)) ?? null
}

export const filterLocalGeocode = (query: string): LocalGeocodeEntry[] => {
  const normalized = normalize(query)
  if (!normalized) return []

  return localGeocodeMap.filter(
    (item) => item.keyword.includes(normalized) || normalized.includes(item.keyword),
  )
}
