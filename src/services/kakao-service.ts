import axios from "axios"
import { env } from "@/services/env"
import { apiClient } from "@/services/api-client"
import { unwrapApiResponse } from "@/types/api"
import { filterLocalGeocode, findLocalGeocode } from "@/mocks/geocode-map"

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

interface GeocodeResponse {
  latitude: number
  longitude: number
  formattedAddress: string
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

const geocodeWithKakao = async (address: string): Promise<KakaoAddressResult | null> => {
  if (!env.kakaoRestApiKey) return null

  const response = await kakaoClient.get<KakaoAddressSearchResponse>("/v2/local/search/address.json", {
    params: { query: address },
    headers: getAuthHeader(),
  })

  const first = response.data.documents?.[0]
  if (!first) return null

  return {
    addressName: first.address_name,
    x: Number(first.x),
    y: Number(first.y),
  }
}

export async function searchAddress(query: string): Promise<KakaoAddressResult[]> {
  const normalized = query.trim()
  if (!normalized) return []

  if (isMockEnabled() && !env.kakaoRestApiKey) {
    const localMatches = filterLocalGeocode(normalized)
    return localMatches.map((item) => ({
      addressName: item.formattedAddress,
      x: item.longitude,
      y: item.latitude,
    }))
  }

  const response = await kakaoClient.get<KakaoAddressSearchResponse>("/v2/local/search/address.json", {
    params: { query: normalized },
    headers: getAuthHeader(),
  })

  return (response.data.documents ?? []).map((doc) => ({
    addressName: doc.address_name,
    x: Number(doc.x),
    y: Number(doc.y),
  }))
}

export async function addressToCoords(address: string): Promise<KakaoAddressResult | null> {
  const normalized = address.trim()
  if (!normalized) return null

  if (!isMockEnabled() && env.apiBaseUrl) {
    try {
      const response = await apiClient.get("/api/v1/geocode", { params: { address: normalized } })
      const data = unwrapApiResponse<GeocodeResponse>(response.data)
      return {
        addressName: data.formattedAddress ?? normalized,
        x: data.longitude,
        y: data.latitude,
      }
    } catch (error) {
      // Fall back to client-side geocoding when the backend is unavailable.
      console.warn("Backend geocoding failed, falling back to client-side.", error)
    }
  }

  const kakaoResult = await geocodeWithKakao(normalized)
  if (kakaoResult) return kakaoResult

  if (isMockEnabled()) {
    // Dev fallback for offline UI work; remove when backend geocode is available.
    const localMatch = findLocalGeocode(normalized)
    if (!localMatch) return null
    return {
      addressName: localMatch.formattedAddress,
      x: localMatch.longitude,
      y: localMatch.latitude,
    }
  }

  return null
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
