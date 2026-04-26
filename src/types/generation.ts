import type { RunningArtProficiency } from "@/types/running-art"

export type RunningArtTaskStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

export interface CreateRunningArtTaskRequest {
  startPosition: string
  shape: string
  proficiency: RunningArtProficiency
}

export interface CreateRunningArtTaskResponse {
  taskId: string
}

export interface RunningArtTaskStatusResponse {
  taskId: string
  status: RunningArtTaskStatus
  resultArtId: number | null
  errorMessage: string | null
}

export interface TrackedRunningArtTask {
  taskId: string
  startPosition: string
  shape: string
  proficiency: RunningArtProficiency
  createdAt: string
  status: RunningArtTaskStatus
  resultArtId: number | null
  errorMessage: string | null
}

export type RunningArtTaskSseEventName = "CONNECT" | "CONNECTED" | "PROCESSING" | "COMPLETED" | "FAILED"

export interface RunningArtTaskSseNotification {
  taskId: string
  status: RunningArtTaskStatus
  message: string | null
  data: string | null
}

export interface RunningArtTaskSseHandlers {
  onConnect?: (notification: RunningArtTaskSseNotification | null) => void
  onProcessing?: (notification: RunningArtTaskSseNotification | null) => void
  onCompleted?: (notification: RunningArtTaskSseNotification | null) => void
  onFailed?: (notification: RunningArtTaskSseNotification | null) => void
  onError?: (error: Error) => void
}

export interface RunningArtTaskSseSubscription {
  close: () => void
}
