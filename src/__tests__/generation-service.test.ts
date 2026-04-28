import { waitFor } from "@testing-library/react"
import { authStorage } from "@/services/auth-storage"
import { getAuthorizedAccessToken } from "@/services/auth-session"
import {
  getTrackedGenerationTask,
  listTrackedGenerationTasks,
  subscribeRunningArtTaskEvents,
  toTrackedGenerationArt,
  upsertTrackedGenerationTask,
} from "@/services/generation-service"
import type { RunningArtTaskStatus, TrackedRunningArtTask } from "@/types/generation"

jest.mock("@/services/env", () => ({
  env: {
    get apiBaseUrl() {
      return process.env.VITE_API_BASE_URL ?? ""
    },
    devBypassAuth: "false",
    kakaoClientId: "",
    kakaoRedirectUri: "",
    useMockApi: "false",
  },
}))

jest.mock("@/services/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

jest.mock("@/services/auth-session", () => ({
  getAuthorizedAccessToken: jest.fn(),
  refreshCurrentStoredTokens: jest.fn(),
}))

const mockedGetAuthorizedAccessToken = getAuthorizedAccessToken as jest.MockedFunction<typeof getAuthorizedAccessToken>
const originalFetch = globalThis.fetch

const makeTask = (taskId: string, userId: string, status: RunningArtTaskStatus = "PROCESSING"): TrackedRunningArtTask => ({
  taskId,
  userId,
  startPosition: "Seoul",
  shape: "HEART",
  proficiency: "BEGINNER",
  createdAt: new Date(0).toISOString(),
  status,
  resultArtId: null,
  errorMessage: null,
})

const setUser = (id: string) => {
  authStorage.setUser({
    id,
    name: id,
    email: `${id}@example.com`,
  })
}

describe("generation-service tracked tasks", () => {
  beforeEach(() => {
    localStorage.clear()
    delete process.env.VITE_API_BASE_URL
    mockedGetAuthorizedAccessToken.mockReset()
    jest.restoreAllMocks()
    if (originalFetch) {
      globalThis.fetch = originalFetch
    } else {
      delete (globalThis as { fetch?: typeof fetch }).fetch
    }
  })

  it("returns only tasks owned by the current stored user", () => {
    setUser("user-1")
    upsertTrackedGenerationTask(makeTask("task-1", "user-1"))

    setUser("user-2")
    upsertTrackedGenerationTask(makeTask("task-2", "user-2"))

    expect(listTrackedGenerationTasks().map((task) => task.taskId)).toEqual(["task-2"])
    expect(getTrackedGenerationTask("task-1")).toBeNull()

    setUser("user-1")

    expect(listTrackedGenerationTasks().map((task) => task.taskId)).toEqual(["task-1"])
    expect(getTrackedGenerationTask("task-1")?.userId).toBe("user-1")
  })

  it("maps completed tracked tasks to completed generation state", () => {
    expect(toTrackedGenerationArt(makeTask("task-1", "user-1", "COMPLETED")).generationState).toBe("COMPLETED")
  })

  it("does not duplicate the api prefix when subscribing to task SSE", async () => {
    process.env.VITE_API_BASE_URL = "https://example.com/api"
    mockedGetAuthorizedAccessToken.mockResolvedValue("access-token")

    const read = jest.fn().mockResolvedValue({ done: true })
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: () => "text/event-stream",
      },
      body: {
        getReader: () => ({ read }),
      },
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const subscription = subscribeRunningArtTaskEvents("task-1", {})

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.com/api/v1/ai/tasks/task-1/subscribe",
        expect.any(Object),
      )
    })

    subscription.close()
  })
})
