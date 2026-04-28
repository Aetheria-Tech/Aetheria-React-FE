import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Link, Route, Routes } from "react-router-dom"
import GenerationStatusPage from "@/pages/GenerationStatusPage"
import {
  getRunningArtTaskStatus,
  getTrackedGenerationTask,
  subscribeRunningArtTaskEvents,
} from "@/services/generation-service"
import { mockAuthPayload, renderWithProviders } from "@/test/test-utils"
import type { RunningArtTaskSseHandlers } from "@/types/generation"

jest.mock("@/services/generation-service", () => ({
  GENERATION_STATUS_POLLING_INTERVAL_MS: 5000,
  getRunningArtTaskStatus: jest.fn(),
  getTrackedGenerationTask: jest.fn(),
  isGeneratingTaskStatus: jest.fn((status: string) => status === "PENDING" || status === "PROCESSING"),
  subscribeRunningArtTaskEvents: jest.fn(() => ({ close: jest.fn() })),
  syncTrackedGenerationTask: jest.fn(
    (
      taskId: string,
      response: { status: string; resultArtId?: number | null; errorMessage?: string | null },
      previous?: { userId?: string; startPosition?: string; shape?: string; proficiency?: string; createdAt?: string },
    ) => {
      if (response.status === "COMPLETED" && response.resultArtId !== null) {
        return null
      }

      return {
        taskId,
        userId: previous?.userId ?? "user-1",
        startPosition: previous?.startPosition ?? "서울시청",
        shape: previous?.shape ?? "HEART",
        proficiency: previous?.proficiency ?? "BEGINNER",
        createdAt: previous?.createdAt ?? new Date(0).toISOString(),
        status: response.status === "COMPLETED" && response.resultArtId === null ? "PROCESSING" : response.status,
        resultArtId: response.resultArtId ?? null,
        errorMessage: response.errorMessage ?? null,
      }
    },
  ),
  upsertTrackedGenerationTask: jest.fn((task) => task),
}))

describe("GenerationStatusPage", () => {
  beforeEach(() => {
    jest.useRealTimers()
    ;(getTrackedGenerationTask as jest.Mock).mockReturnValue({
      taskId: "task-1",
      userId: "user-1",
      startPosition: "서울시청",
      shape: "HEART",
      proficiency: "BEGINNER",
      createdAt: new Date(0).toISOString(),
      status: "PENDING",
      resultArtId: null,
      errorMessage: null,
    })
    ;(getRunningArtTaskStatus as jest.Mock).mockReset()
    ;(subscribeRunningArtTaskEvents as jest.Mock).mockReset()
    ;(subscribeRunningArtTaskEvents as jest.Mock).mockReturnValue({ close: jest.fn() })
  })

  afterEach(() => {
    delete process.env.VITE_GENERATION_SSE_CONNECT_TIMEOUT_MS
  })

  it("auto-navigates to detail when the task is already completed", async () => {
    ;(getRunningArtTaskStatus as jest.Mock).mockResolvedValue({
      taskId: "task-1",
      status: "COMPLETED",
      resultArtId: 42,
      errorMessage: null,
    })

    renderWithProviders(
      <Routes>
        <Route path="/mypage/tasks/:taskId" element={<GenerationStatusPage />} />
        <Route path="/mypage/:id" element={<div>상세 페이지</div>} />
      </Routes>,
      { route: "/mypage/tasks/task-1", auth: mockAuthPayload },
    )

    expect(await screen.findByText("상세 페이지")).toBeInTheDocument()
    expect(subscribeRunningArtTaskEvents).not.toHaveBeenCalled()
  })

  it("shows failure UI when the task fails", async () => {
    ;(getRunningArtTaskStatus as jest.Mock).mockResolvedValue({
      taskId: "task-1",
      status: "FAILED",
      resultArtId: null,
      errorMessage: "모델 오류",
    })

    renderWithProviders(
      <Routes>
        <Route path="/mypage/tasks/:taskId" element={<GenerationStatusPage />} />
      </Routes>,
      { route: "/mypage/tasks/task-1", auth: mockAuthPayload },
    )

    expect(await screen.findByText("생성에 실패했습니다")).toBeInTheDocument()
    expect(screen.getByText("모델 오류")).toBeInTheDocument()
  })

  it("resets stale state when navigating between task ids", async () => {
    const user = userEvent.setup()

    ;(getTrackedGenerationTask as jest.Mock).mockImplementation((nextTaskId: string) => ({
      taskId: nextTaskId,
      userId: "user-1",
      startPosition: nextTaskId === "task-2" ? "Busan Station" : "Seoul Station",
      shape: "HEART",
      proficiency: "BEGINNER",
      createdAt: new Date(0).toISOString(),
      status: "PENDING",
      resultArtId: null,
      errorMessage: null,
    }))
    ;(getRunningArtTaskStatus as jest.Mock).mockImplementation((nextTaskId: string) =>
      Promise.resolve({
        taskId: nextTaskId,
        status: nextTaskId === "task-1" ? "FAILED" : "PROCESSING",
        resultArtId: null,
        errorMessage: nextTaskId === "task-1" ? "model-error" : null,
      }),
    )

    renderWithProviders(
      <Routes>
        <Route
          path="/mypage/tasks/:taskId"
          element={
            <>
              <Link to="/mypage/tasks/task-2">open task 2</Link>
              <GenerationStatusPage />
            </>
          }
        />
      </Routes>,
      { route: "/mypage/tasks/task-1", auth: mockAuthPayload },
    )

    expect(await screen.findByText("model-error")).toBeInTheDocument()

    await user.click(screen.getByRole("link", { name: "open task 2" }))

    expect(await screen.findByText("Busan Station")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText("model-error")).not.toBeInTheDocument())
  })

  it("subscribes to SSE and cleans up on unmount", async () => {
    const close = jest.fn()
    ;(getRunningArtTaskStatus as jest.Mock).mockResolvedValue({
      taskId: "task-1",
      status: "PROCESSING",
      resultArtId: null,
      errorMessage: null,
    })
    ;(subscribeRunningArtTaskEvents as jest.Mock).mockReturnValue({ close })

    const view = renderWithProviders(
      <Routes>
        <Route path="/mypage/tasks/:taskId" element={<GenerationStatusPage />} />
      </Routes>,
      { route: "/mypage/tasks/task-1", auth: mockAuthPayload },
    )

    await waitFor(() => expect(subscribeRunningArtTaskEvents).toHaveBeenCalledTimes(1))

    view.unmount()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("uses the configured SSE connect timeout before switching to polling", async () => {
    process.env.VITE_GENERATION_SSE_CONNECT_TIMEOUT_MS = "12000"
    const setTimeoutSpy = jest.spyOn(window, "setTimeout")

    ;(getRunningArtTaskStatus as jest.Mock).mockResolvedValue({
      taskId: "task-1",
      status: "PROCESSING",
      resultArtId: null,
      errorMessage: null,
    })

    try {
      renderWithProviders(
        <Routes>
          <Route path="/mypage/tasks/:taskId" element={<GenerationStatusPage />} />
        </Routes>,
        { route: "/mypage/tasks/task-1", auth: mockAuthPayload },
      )

      await act(async () => {
        await Promise.resolve()
      })

      expect(subscribeRunningArtTaskEvents).toHaveBeenCalledTimes(1)
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 12000)
    } finally {
      setTimeoutSpy.mockRestore()
    }
  })

  it("falls back to polling when the SSE subscription fails", async () => {
    let handlersRef: RunningArtTaskSseHandlers | undefined
    ;(getRunningArtTaskStatus as jest.Mock).mockResolvedValue({
      taskId: "task-1",
      status: "PROCESSING",
      resultArtId: null,
      errorMessage: null,
    })
    ;(subscribeRunningArtTaskEvents as jest.Mock).mockImplementation((_taskId: string, handlers: RunningArtTaskSseHandlers) => {
      handlersRef = handlers
      return { close: jest.fn() }
    })

    renderWithProviders(
      <Routes>
        <Route path="/mypage/tasks/:taskId" element={<GenerationStatusPage />} />
      </Routes>,
      { route: "/mypage/tasks/task-1", auth: mockAuthPayload },
    )

    await waitFor(() => expect(subscribeRunningArtTaskEvents).toHaveBeenCalledTimes(1))

    const setTimeoutSpy = jest.spyOn(window, "setTimeout")
    act(() => {
      handlersRef?.onError?.(new Error("stream failed"))
    })
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000)
    setTimeoutSpy.mockRestore()
  })

  it("refetches status and navigates when the completed SSE event arrives", async () => {
    let handlersRef: RunningArtTaskSseHandlers | undefined

    ;(getRunningArtTaskStatus as jest.Mock)
      .mockResolvedValueOnce({
        taskId: "task-1",
        status: "PROCESSING",
        resultArtId: null,
        errorMessage: null,
      })
      .mockResolvedValueOnce({
        taskId: "task-1",
        status: "COMPLETED",
        resultArtId: 42,
        errorMessage: null,
      })

    ;(subscribeRunningArtTaskEvents as jest.Mock).mockImplementation((_taskId: string, handlers: RunningArtTaskSseHandlers) => {
      handlersRef = handlers
      return { close: jest.fn() }
    })

    renderWithProviders(
      <Routes>
        <Route path="/mypage/tasks/:taskId" element={<GenerationStatusPage />} />
        <Route path="/mypage/:id" element={<div>상세 페이지</div>} />
      </Routes>,
      { route: "/mypage/tasks/task-1", auth: mockAuthPayload },
    )

    await waitFor(() => expect(subscribeRunningArtTaskEvents).toHaveBeenCalledTimes(1))
    handlersRef?.onCompleted?.({
      taskId: "task-1",
      status: "COMPLETED",
      message: "AI 생성이 완료되었습니다.",
      data: "s3://mock-bucket/dummy-result.png",
    })

    expect(await screen.findByText("상세 페이지")).toBeInTheDocument()
  })
  it("uses the failed SSE message when the status endpoint has not caught up yet", async () => {
    let handlersRef: RunningArtTaskSseHandlers | undefined

    ;(getRunningArtTaskStatus as jest.Mock).mockResolvedValue({
      taskId: "task-1",
      status: "PROCESSING",
      resultArtId: null,
      errorMessage: null,
    })

    ;(subscribeRunningArtTaskEvents as jest.Mock).mockImplementation((_taskId: string, handlers: RunningArtTaskSseHandlers) => {
      handlersRef = handlers
      return { close: jest.fn() }
    })

    renderWithProviders(
      <Routes>
        <Route path="/mypage/tasks/:taskId" element={<GenerationStatusPage />} />
      </Routes>,
      { route: "/mypage/tasks/task-1", auth: mockAuthPayload },
    )

    await waitFor(() => expect(subscribeRunningArtTaskEvents).toHaveBeenCalledTimes(1))
    handlersRef?.onFailed?.({
      taskId: "task-1",
      status: "FAILED",
      message: "AI 연산 중 리소스 부족으로 실패했습니다.",
      data: null,
    })

    expect(await screen.findByText("AI 연산 중 리소스 부족으로 실패했습니다.")).toBeInTheDocument()
  })
})
