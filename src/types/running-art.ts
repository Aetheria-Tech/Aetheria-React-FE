export type RunningArtProficiency = "INTRODUCTION" | "BEGINNER" | "SKILLED" | "EXPERT"

export interface RunningArtSummary {
  id: number
  title: string
  content: string
  shape: string
  proficiency: RunningArtProficiency
  gpx: string
  userId: number
  imageUrl?: string | null
  image_url?: string | null
  distanceKm?: number | string | null
  distance_km?: number | string | null
  isPublic?: boolean | null
  is_public?: boolean | null
  createdAt?: string | null
  created_at?: string | null
}

export type RunningArtDetail = RunningArtSummary

export interface RunningArtPatchRequest {
  title: string
  content: string
}
