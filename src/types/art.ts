export interface Coordinates {
  lat: number
  lng: number
}

export interface Art {
  id: string
  title: string
  content?: string
  imageUrl: string
  distanceKm: number
  theme: string
  isPublic: boolean
  createdAt: string
  ownerId: string
  gpxData?: string
  startAddress?: string
  endAddress?: string
}

export interface CreateArtPayload {
  distanceKm: number
  theme: string
  startAddress: string
  endAddress: string
  startCoords: Coordinates
  endCoords: Coordinates
}

export interface CreateArtResponse {
  art: Art
  gpxData: string
  imageUrl: string
}
