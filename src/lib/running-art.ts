import type { Art } from "@/types/art"
import type { RunningArtDetail, RunningArtSummary } from "@/types/running-art"

const toNumberOrFallback = (value: unknown, fallback: number) => {
  const parsed = typeof value === "string" ? Number(value) : value
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback
}

const toBooleanOrFallback = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback

export const toArtFromRunningArt = (runningArt: RunningArtSummary | RunningArtDetail): Art => {
  const imageUrl = runningArt.imageUrl ?? runningArt.image_url ?? "/placeholder.svg"
  const distanceKm = toNumberOrFallback(runningArt.distanceKm ?? runningArt.distance_km, 0)
  const isPublic = toBooleanOrFallback(runningArt.isPublic ?? runningArt.is_public, false)
  const createdAt = runningArt.createdAt ?? runningArt.created_at ?? ""

  return {
    id: String(runningArt.id),
    title: runningArt.title,
    content: runningArt.content,
    // TODO: remove fallback values when backend response schema guarantees these fields.
    imageUrl,
    distanceKm,
    theme: runningArt.shape,
    isPublic,
    createdAt,
    ownerId: String(runningArt.userId),
    gpxData: runningArt.gpx,
  }
}
