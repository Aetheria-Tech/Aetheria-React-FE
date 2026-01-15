import axios from "axios"
import { env } from "@/services/env"

export interface KakaoAddressResult {
  addressName: string
  x: number
  y: number
}

interface KakaoAddressSearchResponse {
  documents: Array<{
    address_name: string
    x: string
    y: string
  }>
}

interface KakaoCoordToAddressResponse {
  documents: Array<{
    road_address?: { address_name: string }
    address?: { address_name: string }
  }>
}

const kakaoClient = axios.create({
  baseURL: "https://dapi.kakao.com",
})

const mockAddressResults: KakaoAddressResult[] = [
  { addressName: "서울시청", x: 126.978, y: 37.5665 },
  { addressName: "남산공원", x: 126.9895, y: 37.5512 },
  { addressName: "광화문", x: 126.9769, y: 37.5759 },
  { addressName: "한강공원", x: 126.95, y: 37.528 },
]

const isMockEnabled = () => env.useMockApi === "true"

const getAuthHeader = () => {
  if (!env.kakaoRestApiKey) {
    throw new Error("Kakao REST API 키가 없습니다")
  }
  return { Authorization: `KakaoAK ${env.kakaoRestApiKey}` }
}

export async function searchAddress(query: string): Promise<KakaoAddressResult[]> {
  if (isMockEnabled()) {
    const normalized = query.trim()
    if (!normalized) return []
    const filtered = mockAddressResults.filter((item) => item.addressName.includes(normalized))
    return filtered.length > 0 ? filtered : mockAddressResults
  }

  const response = await kakaoClient.get<KakaoAddressSearchResponse>("/v2/local/search/address.json", {
    params: { query },
    headers: getAuthHeader(),
  })

  return (response.data.documents ?? []).map((doc) => ({
    addressName: doc.address_name,
    x: Number(doc.x),
    y: Number(doc.y),
  }))
}

export async function addressToCoords(address: string): Promise<KakaoAddressResult | null> {
  if (isMockEnabled()) {
    const normalized = address.trim()
    if (!normalized) return null
    return mockAddressResults.find((item) => item.addressName.includes(normalized)) ?? mockAddressResults[0] ?? null
  }

  if (!address.trim()) return null
  const results = await searchAddress(address)
  return results[0] ?? null
}

export async function coordsToAddress(lat: number, lng: number): Promise<string | null> {
  if (isMockEnabled()) {
    const closest = mockAddressResults[0]
    return closest ? closest.addressName : `위도 ${lat}, 경도 ${lng}`
  }

  const response = await kakaoClient.get<KakaoCoordToAddressResponse>("/v2/local/geo/coord2address.json", {
    params: { x: lng, y: lat },
    headers: getAuthHeader(),
  })

  const first = response.data.documents?.[0]
  return first?.road_address?.address_name ?? first?.address?.address_name ?? null
}
