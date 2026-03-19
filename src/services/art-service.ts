import { apiClient } from "@/services/api-client"
import { env } from "@/services/env"
import { toArtFromRunningArt } from "@/lib/running-art"
import { unwrapApiResponse, unwrapVoidResponse } from "@/types/api"
import type { Art, Coordinates, CreateArtPayload, CreateArtResponse } from "@/types/art"
import type { RunningArtDetail, RunningArtPatchRequest, RunningArtSummary } from "@/types/running-art"

const mockGpxData = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Aetheria">
  <trk>
    <name>Mock Route</name>
    <trkseg>
      <trkpt lat="37.5665" lon="126.9780"></trkpt>
      <trkpt lat="37.5651" lon="126.9820"></trkpt>
      <trkpt lat="37.5642" lon="126.9865"></trkpt>
    </trkseg>
  </trk>
</gpx>`

const buildMockGpx = (start: Coordinates, end: Coordinates) => {
  const midLat = (start.lat + end.lat) / 2
  const midLng = (start.lng + end.lng) / 2

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Aetheria">
  <trk>
    <name>Dev Route</name>
    <trkseg>
      <trkpt lat="${start.lat}" lon="${start.lng}"></trkpt>
      <trkpt lat="${midLat}" lon="${midLng}"></trkpt>
      <trkpt lat="${end.lat}" lon="${end.lng}"></trkpt>
    </trkseg>
  </trk>
</gpx>`
}

let mockArts: Art[] = [
  {
    id: "mock-1",
    title: "새벽 러닝",
    content: "새벽 공기를 느끼며 달린 러닝",
    imageUrl: "/placeholder.svg",
    distanceKm: 5,
    theme: "하트",
    isPublic: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    ownerId: "dev-user",
    gpxData: mockGpxData,
    startAddress: "서울시청",
    endAddress: "남산공원",
  },
  {
    id: "mock-2",
    title: "도심 러닝",
    content: "도심 야경을 보며 달린 러닝",
    imageUrl: "/placeholder.svg",
    distanceKm: 8,
    theme: "별",
    isPublic: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    ownerId: "dev-user",
    gpxData: mockGpxData,
    startAddress: "광화문",
    endAddress: "한강공원",
  },
]

const isMockEnabled = () => env.useMockApi === "true"

const mapArtToRunningArt = (art: Art, index: number): RunningArtSummary => ({
  id: Number.isFinite(Number(art.id)) ? Number(art.id) : index + 1,
  title: art.title,
  content: art.content ?? "",
  shape: art.theme,
  proficiency: "BEGINNER",
  gpx: art.gpxData ?? "",
  userId: Number.isFinite(Number(art.ownerId)) ? Number(art.ownerId) : 0,
})

export async function createArt(payload: CreateArtPayload): Promise<CreateArtResponse> {
  if (isMockEnabled()) {
    const gpxData = payload.startCoords && payload.endCoords
      ? buildMockGpx(payload.startCoords, payload.endCoords)
      : mockGpxData
    const art: Art = {
      id: `mock-${Date.now()}`,
      title: `${payload.theme} 러닝`,
      content: "",
      imageUrl: "/placeholder.svg",
      distanceKm: payload.distanceKm,
      theme: payload.theme,
      isPublic: false,
      createdAt: new Date().toISOString(),
      ownerId: "dev-user",
      gpxData,
      startAddress: payload.startAddress,
      endAddress: payload.endAddress,
    }
    mockArts = [art, ...mockArts]
    return { art, gpxData, imageUrl: art.imageUrl }
  }
  // Backend create contract is not available in current Swagger/implementation.
  throw new Error("작품 생성 API 계약이 확정되지 않았습니다.")
}

export async function saveArt(artId: string): Promise<Art> {
  if (isMockEnabled()) {
    const art = mockArts.find((item) => item.id === artId)
    if (!art) {
      throw new Error("작품을 찾을 수 없습니다.")
    }
    return art
  }
  const parsedId = Number(artId)
  const detail = await getRunningArtDetail(Number.isFinite(parsedId) ? parsedId : artId)
  return toArtFromRunningArt(detail)
}

export async function fetchMyArts(): Promise<Art[]> {
  if (isMockEnabled()) {
    return [...mockArts]
  }
  const data = await getMyRunningArts()
  return data.map(toArtFromRunningArt)
}

export async function fetchArtById(artId: string): Promise<Art> {
  if (isMockEnabled()) {
    const art = mockArts.find((item) => item.id === artId)
    if (!art) {
      throw new Error("작품을 찾을 수 없습니다.")
    }
    return art
  }
  const parsedId = Number(artId)
  const detail = await getRunningArtDetail(Number.isFinite(parsedId) ? parsedId : artId)
  return toArtFromRunningArt(detail)
}

export async function deleteArt(artId: string): Promise<void> {
  if (isMockEnabled()) {
    mockArts = mockArts.filter((item) => item.id !== artId)
    return
  }
  const parsedId = Number(artId)
  await deleteRunningArt(Number.isFinite(parsedId) ? parsedId : artId)
}

export async function updateShareStatus(artId: string, isPublic: boolean): Promise<Art> {
  if (isMockEnabled()) {
    const art = mockArts.find((item) => item.id === artId)
    if (!art) {
      throw new Error("작품을 찾을 수 없습니다.")
    }
    const updated = { ...art, isPublic }
    mockArts = mockArts.map((item) => (item.id === artId ? updated : item))
    return updated
  }
  throw new Error("공유 토글 API 계약이 확정되지 않았습니다.")
}

export async function fetchGalleryArts(): Promise<Art[]> {
  if (isMockEnabled()) {
    return mockArts.filter((item) => item.isPublic)
  }
  throw new Error("갤러리 목록 API 계약이 확정되지 않았습니다.")
}

export async function getMyRunningArts(): Promise<RunningArtSummary[]> {
  if (isMockEnabled()) {
    return mockArts.map((art, index) => mapArtToRunningArt(art, index))
  }
  const response = await apiClient.get("/api/v1/running-arts/me")
  return unwrapApiResponse<RunningArtSummary[]>(response.data)
}

export async function getRunningArtDetail(runningArtId: number | string): Promise<RunningArtDetail> {
  if (isMockEnabled()) {
    const numericId = Number(runningArtId)
    const index = Number.isFinite(numericId) ? numericId - 1 : -1
    const art = index >= 0 && index < mockArts.length ? mockArts[index] : null
    if (!art) {
      throw new Error("작품을 찾을 수 없습니다.")
    }
    return mapArtToRunningArt(art, index)
  }
  const response = await apiClient.get(`/api/v1/running-arts/${runningArtId}`)
  return unwrapApiResponse<RunningArtDetail>(response.data)
}

export async function deleteRunningArt(runningArtId: number | string): Promise<void> {
  if (isMockEnabled()) {
    const numericId = Number(runningArtId)
    const index = Number.isFinite(numericId) ? numericId - 1 : -1
    if (index >= 0 && index < mockArts.length) {
      mockArts = mockArts.filter((_, idx) => idx !== index)
      return
    }
    throw new Error("작품을 찾을 수 없습니다.")
  }
  const response = await apiClient.delete(`/api/v1/running-arts/${runningArtId}`)
  unwrapVoidResponse(response.data)
}

export async function patchRunningArt(
  runningArtId: number | string,
  payload: RunningArtPatchRequest,
): Promise<void> {
  if (isMockEnabled()) {
    const numericId = Number(runningArtId)
    const index = Number.isFinite(numericId) ? numericId - 1 : -1
    if (index >= 0 && index < mockArts.length) {
      mockArts = mockArts.map((item, idx) =>
        idx === index ? { ...item, title: payload.title, content: payload.content } : item,
      )
      return
    }
    throw new Error("작품을 찾을 수 없습니다.")
  }
  const response = await apiClient.patch(`/api/v1/running-arts/${runningArtId}`, payload)
  unwrapVoidResponse(response.data)
}
