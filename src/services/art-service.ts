import { apiClient } from "@/services/api-client"
import reportDemoGpx from "@/assets/report-gyeongbokgung-dog-run.gpx?raw"
import { env } from "@/services/env"
import { unwrapApiResponse, unwrapVoidResponse } from "@/types/api"
import type { Art, Coordinates, CreateArtPayload, CreateArtResponse } from "@/types/art"
import type { RunningArtDetail, RunningArtPatchRequest, RunningArtSummary } from "@/types/running-art"

const SAMPLE_RUNNING_ART_ID = -1
const SAMPLE_ROUTE_ID = String(SAMPLE_RUNNING_ART_ID)

type PagedResponse<T> = {
  content?: T[]
  last?: boolean
  number?: number
  totalPages?: number
}

const MY_RUNNING_ART_PAGE_SIZE = 100
const MY_RUNNING_ART_SORT = "createdAt,desc"
const MAX_MY_RUNNING_ART_PAGE_COUNT = 50

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

const unsupportedBackendEndpoint = (feature: string) =>
  new Error(`${feature}은 현재 백엔드 API 계약에서 제공되지 않습니다.`)

const mapArtToRunningArt = (art: Art, index: number): RunningArtSummary => ({
  id: Number.isFinite(Number(art.id)) ? Number(art.id) : index + 1,
  title: art.title,
  content: art.content ?? "",
  shape: art.theme,
  proficiency: "BEGINNER",
  gpx: art.gpxData ?? "",
  userId: Number.isFinite(Number(art.ownerId)) ? Number(art.ownerId) : 0,
})

const normalizeSampleRunningArt = (runningArt: RunningArtDetail): RunningArtDetail => ({
  ...runningArt,
  id: SAMPLE_RUNNING_ART_ID,
})

const unwrapRunningArtPage = (value: unknown): PagedResponse<RunningArtSummary> => {
  const data = unwrapApiResponse<RunningArtSummary[] | PagedResponse<RunningArtSummary>>(value)

  if (Array.isArray(data)) {
    return {
      content: data,
      last: true,
      number: 0,
      totalPages: 1,
    }
  }

  return {
    ...data,
    content: Array.isArray(data.content) ? data.content : [],
  }
}

const shouldFetchNextRunningArtPage = (page: PagedResponse<RunningArtSummary>, requestedPage: number) => {
  if (page.last === true) return false

  if (typeof page.totalPages === "number" && Number.isFinite(page.totalPages)) {
    return requestedPage + 1 < page.totalPages
  }

  return (page.content?.length ?? 0) >= MY_RUNNING_ART_PAGE_SIZE
}

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
  throw unsupportedBackendEndpoint("동기식 작품 생성 API")
}

export async function saveArt(artId: string): Promise<Art> {
  if (isMockEnabled()) {
    const art = mockArts.find((item) => item.id === artId)
    if (!art) {
      throw new Error("작품을 찾을 수 없습니다.")
    }
    return art
  }
  throw unsupportedBackendEndpoint("작품 저장 API")
}

export async function fetchMyArts(): Promise<Art[]> {
  if (isMockEnabled()) {
    return [...mockArts]
  }
  throw unsupportedBackendEndpoint("legacy 내 작품 API")
}

export async function fetchArtById(artId: string): Promise<Art> {
  if (isMockEnabled()) {
    const art = mockArts.find((item) => item.id === artId)
    if (!art) {
      throw new Error("작품을 찾을 수 없습니다.")
    }
    return art
  }
  throw unsupportedBackendEndpoint("legacy 작품 상세 API")
}

export async function deleteArt(artId: string): Promise<void> {
  if (isMockEnabled()) {
    mockArts = mockArts.filter((item) => item.id !== artId)
    return
  }
  throw unsupportedBackendEndpoint("legacy 작품 삭제 API")
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
  throw unsupportedBackendEndpoint("작품 공개 공유 API")
}

export async function fetchGalleryArts(): Promise<Art[]> {
  if (isMockEnabled()) {
    return mockArts.filter((item) => item.isPublic)
  }
  throw unsupportedBackendEndpoint("public gallery API")
}

export async function getMyRunningArts(): Promise<RunningArtSummary[]> {
  if (isMockEnabled()) {
    return mockArts.map((art, index) => mapArtToRunningArt(art, index))
  }

  const runningArts: RunningArtSummary[] = []

  for (let pageNumber = 0; pageNumber < MAX_MY_RUNNING_ART_PAGE_COUNT; pageNumber += 1) {
    const response = await apiClient.get("/api/v1/running-arts/me", {
      params: {
        page: pageNumber,
        size: MY_RUNNING_ART_PAGE_SIZE,
        sort: MY_RUNNING_ART_SORT,
      },
    })
    const page = unwrapRunningArtPage(response.data)

    runningArts.push(...(page.content ?? []))

    if (!shouldFetchNextRunningArtPage(page, pageNumber)) {
      break
    }
  }

  return runningArts
}

export async function getRunningArtSample(): Promise<RunningArtDetail> {
  return normalizeSampleRunningArt({
    id: SAMPLE_RUNNING_ART_ID,
    title: "경복궁 댕댕런",
    content: "예시 gpx",
    shape: "DOG_RUN",
    proficiency: "BEGINNER",
    gpx: reportDemoGpx,
    userId: 0,
    imageUrl: "/placeholder.svg",
    distanceKm: 8.7,
    isPublic: false,
    createdAt: "2025-05-06T02:46:07.000Z",
  })
}

export async function getRunningArtDetail(runningArtId: number | string): Promise<RunningArtDetail> {
  if (String(runningArtId) === SAMPLE_ROUTE_ID) {
    return getRunningArtSample()
  }
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
  if (String(runningArtId) === SAMPLE_ROUTE_ID) {
    throw new Error("샘플 작품은 삭제할 수 없습니다.")
  }
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
  if (String(runningArtId) === SAMPLE_ROUTE_ID) {
    throw new Error("샘플 작품은 수정할 수 없습니다.")
  }
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
