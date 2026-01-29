export type RunningArtProficiency = "INTRODUCTION" | "BEGINNER" | "SKILLED" | "EXPERT" | "MASTER"

export interface RunningArtSummary {
  id: number
  title: string
  content: string
  shape: string
  proficiency: RunningArtProficiency
  gpx: string
  userId: number
}

export type RunningArtDetail = RunningArtSummary

export interface RunningArtPatchRequest {
  title: string
  content: string
}
