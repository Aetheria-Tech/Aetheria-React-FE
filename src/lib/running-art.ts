import type { Art } from "@/types/art"
import type { RunningArtDetail, RunningArtSummary } from "@/types/running-art"

export const toArtFromRunningArt = (runningArt: RunningArtSummary | RunningArtDetail): Art => ({
  id: String(runningArt.id),
  title: runningArt.title,
  content: runningArt.content,
  imageUrl: "/placeholder.svg",
  distanceKm: 0,
  theme: runningArt.shape,
  isPublic: false,
  createdAt: "",
  ownerId: String(runningArt.userId),
  gpxData: runningArt.gpx,
})
