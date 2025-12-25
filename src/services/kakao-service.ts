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

const getAuthHeader = () => {
  if (!env.kakaoRestApiKey) {
    throw new Error("Kakao REST API 키가 없습니다")
  }
  return { Authorization: `KakaoAK ${env.kakaoRestApiKey}` }
}

export async function searchAddress(query: string): Promise<KakaoAddressResult[]> {
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
  if (!address.trim()) return null
  const results = await searchAddress(address)
  return results[0] ?? null
}

export async function coordsToAddress(lat: number, lng: number): Promise<string | null> {
  const response = await kakaoClient.get<KakaoCoordToAddressResponse>("/v2/local/geo/coord2address.json", {
    params: { x: lng, y: lat },
    headers: getAuthHeader(),
  })

  const first = response.data.documents?.[0]
  return first?.road_address?.address_name ?? first?.address?.address_name ?? null
}
