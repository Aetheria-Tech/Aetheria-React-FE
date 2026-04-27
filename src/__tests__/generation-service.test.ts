import { authStorage } from "@/services/auth-storage"
import {
  getTrackedGenerationTask,
  listTrackedGenerationTasks,
  upsertTrackedGenerationTask,
} from "@/services/generation-service"
import type { TrackedRunningArtTask } from "@/types/generation"

jest.mock("@/services/env", () => ({
  env: {
    apiBaseUrl: "",
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

const makeTask = (taskId: string, userId: string): TrackedRunningArtTask => ({
  taskId,
  userId,
  startPosition: "Seoul",
  shape: "HEART",
  proficiency: "BEGINNER",
  createdAt: new Date(0).toISOString(),
  status: "PROCESSING",
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
})
