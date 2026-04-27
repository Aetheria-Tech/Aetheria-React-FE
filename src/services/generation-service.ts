import { apiClient } from "@/services/api-client"
import { refreshTokens } from "@/services/auth-service"
import { authStorage } from "@/services/auth-storage"
import { shouldRefreshAccessToken } from "@/services/auth-token"
import { env } from "@/services/env"
import { unwrapApiResponse } from "@/types/api"
import type { AuthTokens } from "@/types/auth"
import type { Art } from "@/types/art"
import type {
  CreateRunningArtTaskRequest,
  CreateRunningArtTaskResponse,
  RunningArtTaskStatus,
  RunningArtTaskSseEventName,
  RunningArtTaskSseHandlers,
  RunningArtTaskSseNotification,
  RunningArtTaskSseSubscription,
  RunningArtTaskStatusResponse,
  TrackedRunningArtTask,
} from "@/types/generation"
import type { RunningArtProficiency } from "@/types/running-art"

const STORAGE_KEY = "aetheria-running-art-task-history"
const DEFAULT_PROFICIENCY: RunningArtProficiency = "BEGINNER"
const FAILED_TASK_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
let refreshPromise: Promise<AuthTokens | null> | null = null

export const GENERATION_STATUS_POLLING_INTERVAL_MS = 5000
export const DEFAULT_TRACKED_TASK_SHAPE = "러닝아트"

const isBrowser = () => typeof window !== "undefined"
const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const buildApiUrl = (path: string) => {
  const baseUrl = env.apiBaseUrl.trim()
  return baseUrl ? `${trimTrailingSlash(baseUrl)}${path}` : path
}

const refreshStoredTokens = async (tokens: AuthTokens): Promise<AuthTokens | null> => {
  if (!refreshPromise) {
    refreshPromise = refreshTokens(tokens.accessToken)
      .then((nextTokens) => {
        authStorage.setTokens(nextTokens)
        return nextTokens
      })
      .catch(() => {
        authStorage.clear()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

const getAuthorizedAccessToken = async (): Promise<string | null> => {
  let tokens = authStorage.getTokens()
  if (!tokens?.accessToken) return null

  if (shouldRefreshAccessToken(tokens)) {
    tokens = await refreshStoredTokens(tokens)
  }

  return tokens?.accessToken ?? null
}

const isTrackedRunningArtTask = (value: unknown): value is TrackedRunningArtTask => {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<TrackedRunningArtTask>
  return (
    typeof candidate.taskId === "string" &&
    typeof candidate.startPosition === "string" &&
    typeof candidate.shape === "string" &&
    typeof candidate.proficiency === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.status === "string"
  )
}

const sortTasks = (tasks: TrackedRunningArtTask[]) =>
  [...tasks].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

const shouldRetainTrackedTask = (task: TrackedRunningArtTask, now = Date.now()) => {
  if (task.status !== "FAILED") return true

  const createdAtTime = new Date(task.createdAt).getTime()
  if (Number.isNaN(createdAtTime)) return true

  return now - createdAtTime < FAILED_TASK_RETENTION_MS
}

const readTrackedTasks = (): TrackedRunningArtTask[] => {
  if (!isBrowser()) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const trackedTasks = parsed.filter(isTrackedRunningArtTask)
    const retainedTasks = trackedTasks.filter((task) => shouldRetainTrackedTask(task))

    if (retainedTasks.length !== trackedTasks.length) {
      writeTrackedTasks(retainedTasks)
    }

    return sortTasks(retainedTasks)
  } catch {
    return []
  }
}

const writeTrackedTasks = (tasks: TrackedRunningArtTask[]) => {
  if (!isBrowser()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortTasks(tasks)))
}

const toTrackedTask = (
  taskId: string,
  statusResponse: RunningArtTaskStatusResponse,
  previous?: Partial<TrackedRunningArtTask>,
): TrackedRunningArtTask => ({
  taskId,
  startPosition: previous?.startPosition ?? "",
  shape: previous?.shape ?? DEFAULT_TRACKED_TASK_SHAPE,
  proficiency: previous?.proficiency ?? DEFAULT_PROFICIENCY,
  createdAt: previous?.createdAt ?? new Date().toISOString(),
  status: statusResponse.status,
  resultArtId: statusResponse.resultArtId,
  errorMessage: statusResponse.errorMessage,
})

export const isFinalTaskStatus = (status: RunningArtTaskStatus) => status === "COMPLETED" || status === "FAILED"

export const isGeneratingTaskStatus = (status: RunningArtTaskStatus) =>
  status === "PENDING" || status === "PROCESSING"

const dispatchTaskSseEvent = (rawEvent: string, handlers: RunningArtTaskSseHandlers) => {
  const lines = rawEvent.split(/\r\n|\r|\n/)
  let eventName: RunningArtTaskSseEventName | null = null
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue

    if (line.startsWith("event:")) {
      const rawName = line.slice("event:".length).trim()
      if (
        rawName === "CONNECT" ||
        rawName === "CONNECTED" ||
        rawName === "PROCESSING" ||
        rawName === "COMPLETED" ||
        rawName === "FAILED"
      ) {
        eventName = rawName
      }
      continue
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(line.startsWith("data: ") ? 6 : 5))
    }
  }

  if (!eventName) return

  const payload = dataLines.join("\n")
  const notification = parseSseNotification(payload)

  if (eventName === "CONNECT" || eventName === "CONNECTED") {
    handlers.onConnect?.(notification)
    return
  }

  if (eventName === "PROCESSING") {
    handlers.onProcessing?.(notification)
    return
  }

  if (eventName === "COMPLETED") {
    handlers.onCompleted?.(notification)
    return
  }

  handlers.onFailed?.(notification)
}

const isSseNotification = (value: unknown): value is RunningArtTaskSseNotification => {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<RunningArtTaskSseNotification>
  const hasValidMessage = candidate.message === null || typeof candidate.message === "string"
  const hasValidData = candidate.data === null || typeof candidate.data === "string"

  return (
    typeof candidate.taskId === "string" &&
    hasValidMessage &&
    hasValidData &&
    (candidate.status === "PENDING" ||
      candidate.status === "PROCESSING" ||
      candidate.status === "COMPLETED" ||
      candidate.status === "FAILED")
  )
}

const parseSseNotification = (payload: string): RunningArtTaskSseNotification | null => {
  if (!payload.trim()) return null

  try {
    const parsed = JSON.parse(payload) as unknown
    return isSseNotification(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function listTrackedGenerationTasks(): TrackedRunningArtTask[] {
  return readTrackedTasks()
}

export function getTrackedGenerationTask(taskId: string): TrackedRunningArtTask | null {
  return readTrackedTasks().find((task) => task.taskId === taskId) ?? null
}

export function upsertTrackedGenerationTask(task: TrackedRunningArtTask): TrackedRunningArtTask {
  const nextTasks = readTrackedTasks().filter((candidate) => candidate.taskId !== task.taskId)
  nextTasks.unshift(task)
  writeTrackedTasks(nextTasks)
  return task
}

export function removeTrackedGenerationTask(taskId: string) {
  writeTrackedTasks(readTrackedTasks().filter((task) => task.taskId !== taskId))
}

export function syncTrackedGenerationTask(
  taskId: string,
  statusResponse: RunningArtTaskStatusResponse,
  previous?: Partial<TrackedRunningArtTask>,
): TrackedRunningArtTask | null {
  const effectiveResponse =
    statusResponse.status === "COMPLETED" && statusResponse.resultArtId === null
      ? { ...statusResponse, status: "PROCESSING" as const }
      : statusResponse

  if (effectiveResponse.status === "COMPLETED" && effectiveResponse.resultArtId !== null) {
    removeTrackedGenerationTask(taskId)
    return null
  }

  const trackedTask = toTrackedTask(taskId, effectiveResponse, previous ?? getTrackedGenerationTask(taskId) ?? undefined)
  return upsertTrackedGenerationTask(trackedTask)
}

export function toTrackedGenerationArt(task: TrackedRunningArtTask): Art {
  const isFailed = task.status === "FAILED"

  return {
    id: `task:${task.taskId}`,
    title: `${task.shape} 러닝아트`,
    content: isFailed
      ? task.errorMessage?.trim() || "생성에 실패했습니다."
      : `${task.startPosition || "선택한 출발지"}에서 경로를 만들고 있습니다.`,
    imageUrl: "/placeholder.svg",
    distanceKm: 0,
    theme: task.shape,
    isPublic: false,
    createdAt: task.createdAt,
    ownerId: "",
    startAddress: task.startPosition,
    generationState: isFailed ? "FAILED" : "GENERATING",
    taskId: task.taskId,
    generationErrorMessage: task.errorMessage,
    isGenerationTask: true,
  }
}

export async function createRunningArtTask(
  payload: CreateRunningArtTaskRequest,
): Promise<CreateRunningArtTaskResponse> {
  const response = await apiClient.post("/api/v1/running-arts/tasks", payload)
  const taskId = unwrapApiResponse<string>(response.data)

  return { taskId }
}

export async function getRunningArtTaskStatus(taskId: string): Promise<RunningArtTaskStatusResponse> {
  const response = await apiClient.get(`/api/v1/running-arts/tasks/${taskId}`)
  const data = unwrapApiResponse<{
    taskId: string
    status: RunningArtTaskStatus
    resultArtId?: number | null
    errorMessage?: string | null
  }>(response.data)

  return {
    taskId: data.taskId,
    status: data.status,
    resultArtId: data.resultArtId ?? null,
    errorMessage: data.errorMessage ?? null,
  }
}

export function subscribeRunningArtTaskEvents(
  taskId: string,
  handlers: RunningArtTaskSseHandlers,
): RunningArtTaskSseSubscription {
  const controller = new AbortController()
  let closed = false

  const readEventStream = async (response: Response) => {
    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("text/event-stream")) {
      throw new Error("SSE endpoint did not return an event-stream response.")
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("SSE response body is not readable.")
    }

    const decoder = new TextDecoder("utf-8")
    let buffer = ""

    while (!closed) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split(/\r\n\r\n|\r\r|\n\n/)
      buffer = chunks.pop() ?? ""

      for (const chunk of chunks) {
        if (chunk.trim()) {
          dispatchTaskSseEvent(chunk, handlers)
        }
      }
    }

    if (buffer.trim()) {
      dispatchTaskSseEvent(buffer, handlers)
    }
  }

  void (async () => {
    try {
      const requestStream = async (accessToken: string) =>
        fetch(buildApiUrl(`/api/v1/ai/tasks/${encodeURIComponent(taskId)}/subscribe`), {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        })

      let accessToken = await getAuthorizedAccessToken()
      if (!accessToken) {
        throw new Error("Authentication is required to subscribe to task updates.")
      }

      let response = await requestStream(accessToken)

      if (response.status === 401) {
        const storedTokens = authStorage.getTokens()
        if (!storedTokens) {
          throw new Error("Authentication is required to subscribe to task updates.")
        }

        const nextTokens = await refreshStoredTokens(storedTokens)
        if (!nextTokens?.accessToken) {
          throw new Error("Authentication is required to subscribe to task updates.")
        }

        accessToken = nextTokens.accessToken
        response = await requestStream(accessToken)
      }

      if (!response.ok) {
        throw new Error(`SSE subscription failed with status ${response.status}.`)
      }

      await readEventStream(response)

      if (!closed) {
        handlers.onError?.(new Error("SSE connection closed before the task finished."))
      }
    } catch (error) {
      if (closed || controller.signal.aborted) return
      handlers.onError?.(error instanceof Error ? error : new Error("Failed to subscribe to task updates."))
    }
  })()

  return {
    close: () => {
      closed = true
      controller.abort()
    },
  }
}
