import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertCircle, ArrowLeft, RefreshCcw } from "lucide-react"
import AppBackground from "@/components/layouts/app-background"
import GlobalHeader from "@/components/layouts/global-header"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/formatters"
import { env } from "@/services/env"
import {
  DEFAULT_TRACKED_TASK_SHAPE,
  GENERATION_STATUS_POLLING_INTERVAL_MS,
  getRunningArtTaskStatus,
  getTrackedGenerationTask,
  isGeneratingTaskStatus,
  subscribeRunningArtTaskEvents,
  syncTrackedGenerationTask,
  upsertTrackedGenerationTask,
} from "@/services/generation-service"
import type {
  RunningArtTaskSseSubscription,
  RunningArtTaskSseNotification,
  RunningArtTaskStatus,
  RunningArtTaskStatusResponse,
  TrackedRunningArtTask,
} from "@/types/generation"

const DEFAULT_SSE_CONNECT_TIMEOUT_MS = 10000
const DEFAULT_PROFICIENCY = "BEGINNER" as const
const faviconMascot = "/favicon.png"

const getSseConnectTimeoutMs = () => {
  const timeoutMs = Number(env.generationSseConnectTimeoutMs)
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_SSE_CONNECT_TIMEOUT_MS
}

const getGuideMessage = (status: RunningArtTaskStatus | null) => {
  if (status === "PROCESSING") return "경로가 만들어지고 있습니다. 잠시만 기다려주세요."
  if (status === "FAILED") return "생성에 실패했습니다. 다시 시도하거나 마이페이지에서 상태를 확인해 주세요."
  return "생성 요청이 접수되었습니다. 상태를 확인하는 중입니다."
}

const normalizeTaskStatus = (response: RunningArtTaskStatusResponse): RunningArtTaskStatus =>
  response.status === "COMPLETED" && response.resultArtId === null ? "PROCESSING" : response.status

const getSseResultArtId = (notification: RunningArtTaskSseNotification | null) => {
  const rawResultArtId = notification?.data?.trim()
  if (!rawResultArtId) return null

  const resultArtId = Number(rawResultArtId)
  return Number.isSafeInteger(resultArtId) && resultArtId >= 0 ? resultArtId : null
}

const getCreatedAtLabel = (createdAt: string | null | undefined) => {
  const trimmed = createdAt?.trim()
  return trimmed ? formatDateTime(trimmed) : "확인 중"
}

function LoadingMotion() {
  return (
    <div className="flex justify-center">
      <div className="flex items-center justify-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="generation-loader-shadow absolute bottom-1 h-3 w-14 rounded-full bg-black/35 blur-sm" />
          <img
            src={faviconMascot}
            alt="생성 중인 러닝화"
            className="generation-loader-float relative z-10 h-16 w-16 rounded-full object-cover drop-shadow-[0_0_18px_rgba(255,255,255,0.2)]"
          />
        </div>
      </div>
    </div>
  )
}

export default function GenerationStatusPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const navigateOnceRef = useRef(false)
  const failureCountRef = useRef(0)
  const activeTaskIdRef = useRef(taskId ?? null)
  const sseSubscriptionRef = useRef<RunningArtTaskSseSubscription | null>(null)
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sseConnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [task, setTask] = useState<TrackedRunningArtTask | null>(() =>
    taskId ? getTrackedGenerationTask(taskId) : null,
  )
  const [status, setStatus] = useState<RunningArtTaskStatus | null>(task?.status ?? null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  const taskRef = useRef(task)
  const statusRef = useRef(status)

  useEffect(() => {
    taskRef.current = task
  }, [task])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const clearSseConnectTimeout = useCallback(() => {
    if (sseConnectTimeoutRef.current !== null) {
      clearTimeout(sseConnectTimeoutRef.current)
      sseConnectTimeoutRef.current = null
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollingTimeoutRef.current !== null) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
  }, [])

  const closeSseSubscription = useCallback(() => {
    clearSseConnectTimeout()
    sseSubscriptionRef.current?.close()
    sseSubscriptionRef.current = null
  }, [clearSseConnectTimeout])

  const isActiveTask = useCallback(() => Boolean(taskId && activeTaskIdRef.current === taskId), [taskId])

  useEffect(() => {
    // taskId가 바뀌면 이전 task의 SSE/polling 응답이 현재 화면을 덮어쓰지 못하게 초기화한다.
    activeTaskIdRef.current = taskId ?? null
    navigateOnceRef.current = false
    failureCountRef.current = 0
    closeSseSubscription()
    stopPolling()

    const nextTask = taskId ? getTrackedGenerationTask(taskId) : null
    const nextStatus = nextTask?.status ?? null

    taskRef.current = nextTask
    statusRef.current = nextStatus
    setTask(nextTask)
    setStatus(nextStatus)
    setSyncError(null)
    setIsChecking(Boolean(taskId))
  }, [closeSseSubscription, stopPolling, taskId])

  const updateFailedTask = useCallback(
    (message: string | null) => {
      if (!taskId || !isActiveTask()) return

      const current = taskRef.current
      const nextTask: TrackedRunningArtTask = {
        taskId,
        userId: current?.userId ?? "",
        startPosition: current?.startPosition ?? "",
        shape: current?.shape ?? DEFAULT_TRACKED_TASK_SHAPE,
        proficiency: current?.proficiency ?? DEFAULT_PROFICIENCY,
        createdAt: current?.createdAt ?? "",
        status: "FAILED",
        resultArtId: current?.resultArtId ?? null,
        errorMessage: message ?? current?.errorMessage ?? null,
      }

      const storedTask = upsertTrackedGenerationTask(nextTask)

      setIsChecking(false)
      setStatus("FAILED")
      setTask(storedTask)
      taskRef.current = storedTask
      statusRef.current = "FAILED"
    },
    [isActiveTask, taskId],
  )

  const completeWithResultArtId = useCallback(
    (resultArtId: number) => {
      if (!taskId || !isActiveTask() || navigateOnceRef.current) return false

      // 완료 이벤트가 중복 도착해도 상세 페이지 이동은 한 번만 수행한다.
      const completedTask = syncTrackedGenerationTask(
        taskId,
        {
          taskId,
          status: "COMPLETED",
          resultArtId,
          errorMessage: null,
        },
        taskRef.current ?? undefined,
      )
      const visibleCompletedTask =
        completedTask ??
        (taskRef.current
          ? {
              ...taskRef.current,
              status: "COMPLETED" as const,
              resultArtId,
              errorMessage: null,
            }
          : null)

      navigateOnceRef.current = true
      closeSseSubscription()
      stopPolling()
      taskRef.current = visibleCompletedTask
      statusRef.current = "COMPLETED"
      setTask(visibleCompletedTask)
      setStatus("COMPLETED")
      setSyncError(null)
      setIsChecking(false)
      navigate(`/mypage/${resultArtId}`, { replace: true })
      return true
    },
    [closeSseSubscription, isActiveTask, navigate, stopPolling, taskId],
  )

  const syncTaskStatus = useCallback(async (): Promise<RunningArtTaskStatusResponse | null> => {
    if (!taskId || !isActiveTask() || navigateOnceRef.current) return null

    try {
      const response = await getRunningArtTaskStatus(taskId)
      if (!isActiveTask() || navigateOnceRef.current) return null

      const nextStatus = normalizeTaskStatus(response)
      const previousTask = taskRef.current ?? undefined
      const nextTask = syncTrackedGenerationTask(taskId, response, previousTask)

      failureCountRef.current = 0
      taskRef.current = nextTask ?? previousTask ?? null
      statusRef.current = nextStatus

      setTask(nextTask ?? previousTask ?? null)
      setStatus(nextStatus)
      setSyncError(null)
      setIsChecking(false)

      if (response.status === "FAILED") {
        closeSseSubscription()
        stopPolling()
      }

      if (response.status === "COMPLETED" && response.resultArtId !== null) {
        completeWithResultArtId(response.resultArtId)
      }

      return response
    } catch {
      if (!isActiveTask()) return null

      failureCountRef.current += 1
      setIsChecking(false)

      if (failureCountRef.current >= 3) {
        setSyncError("상태를 확인하지 못하고 있습니다. 잠시 후 다시 시도해 주세요.")
      }

      return null
    }
  }, [closeSseSubscription, completeWithResultArtId, isActiveTask, stopPolling, taskId])

  const startPollingFallback = useCallback(
    (message?: string) => {
      if (!isActiveTask() || navigateOnceRef.current || pollingTimeoutRef.current !== null) return

      closeSseSubscription()

      if (message) {
        setSyncError(message)
      }

      // SSE가 불안정하면 이전 조회가 끝난 뒤 다음 조회를 예약하는 polling으로 전환한다.
      const pollOnce = () => {
        if (navigateOnceRef.current || statusRef.current === "FAILED") {
          stopPolling()
          return
        }

        void syncTaskStatus().finally(() => {
          if (navigateOnceRef.current || statusRef.current === "FAILED" || pollingTimeoutRef.current === null) {
            stopPolling()
            return
          }

          pollingTimeoutRef.current = setTimeout(pollOnce, GENERATION_STATUS_POLLING_INTERVAL_MS)
        })
      }

      pollingTimeoutRef.current = setTimeout(pollOnce, GENERATION_STATUS_POLLING_INTERVAL_MS)
    },
    [closeSseSubscription, isActiveTask, stopPolling, syncTaskStatus],
  )

  const openSseSubscription = useCallback(() => {
    if (!taskId || !isActiveTask() || sseSubscriptionRef.current || navigateOnceRef.current) return

    sseConnectTimeoutRef.current = setTimeout(() => {
      startPollingFallback("실시간 연결을 확인하지 못해 상태 조회로 전환했습니다.")
    }, getSseConnectTimeoutMs())

    sseSubscriptionRef.current = subscribeRunningArtTaskEvents(taskId, {
      onConnect: () => {
        if (!isActiveTask()) return

        clearSseConnectTimeout()
        stopPolling()
        setSyncError(null)
      },
      onCompleted: (notification) => {
        if (!isActiveTask()) return

        const resultArtId = getSseResultArtId(notification)
        if (resultArtId !== null && completeWithResultArtId(resultArtId)) return

        // SSE 완료 이벤트에 결과 ID가 없거나 형식이 틀리면 상태 API로 한 번 더 확인한다.
        clearSseConnectTimeout()
        closeSseSubscription()

        void syncTaskStatus().then((response) => {
          if (!response || response.status !== "COMPLETED" || response.resultArtId === null) {
            startPollingFallback()
          }
        })
      },
      onFailed: (notification) => {
        if (!isActiveTask()) return

        clearSseConnectTimeout()
        closeSseSubscription()
        stopPolling()
        const message = notification?.message

        void syncTaskStatus().then((response) => {
          if (!response || response.status !== "FAILED") {
            updateFailedTask(message || "러닝아트 생성 중 오류가 발생했습니다.")
          }
        })
      },
      onError: () => {
        if (!isActiveTask() || navigateOnceRef.current || statusRef.current === "FAILED") return
        startPollingFallback("실시간 연결이 불안정해 상태를 다시 확인 중입니다.")
      },
    })
  }, [
    clearSseConnectTimeout,
    closeSseSubscription,
    completeWithResultArtId,
    isActiveTask,
    startPollingFallback,
    stopPolling,
    syncTaskStatus,
    taskId,
    updateFailedTask,
  ])

  useEffect(() => {
    if (!taskId) {
      setIsChecking(false)
      setSyncError("올바르지 않은 생성 상태 경로입니다.")
      return
    }

    let disposed = false

    const initialize = async () => {
      const response = await syncTaskStatus()
      if (disposed || !isActiveTask() || navigateOnceRef.current) return

      const shouldSubscribe = response === null || isGeneratingTaskStatus(normalizeTaskStatus(response))

      if (shouldSubscribe) {
        openSseSubscription()
      }
    }

    void initialize()

    return () => {
      disposed = true
      closeSseSubscription()
      stopPolling()
    }
  }, [closeSseSubscription, isActiveTask, openSseSubscription, stopPolling, syncTaskStatus, taskId])

  const heading = useMemo(() => {
    if (status === "FAILED") return "생성에 실패했습니다"
    return "생성 중입니다"
  }, [status])

  const description = useMemo(() => getGuideMessage(status), [status])

  return (
    <AppBackground overlayClassName="bg-black/60">
      <GlobalHeader />

      <main className="flex-1 px-4 pb-12 pt-24 sm:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <Link to="/mypage">
              <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" />
                마이페이지로
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void syncTaskStatus()}
              className="border-white/15 bg-surface-container-high text-white hover:bg-white/10"
            >
              <RefreshCcw className="h-4 w-4" />
              상태 다시 확인
            </Button>
          </div>

          <section className="rounded-3xl border border-white/15 bg-surface-container/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
            <div className="text-center">
              <p className="text-sm font-semibold text-primary">Running Art Task</p>
              <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{heading}</h1>
              <p className="mt-3 text-sm text-white/75 sm:text-base">{description}</p>
            </div>

            <div className="mt-8">
              {status === "FAILED" ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive-container/35 p-6 text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                    <div className="space-y-2">
                      <p className="font-semibold text-on-destructive-container">생성 작업을 완료하지 못했습니다.</p>
                      <p className="text-sm text-on-destructive-container/80">
                        {task?.errorMessage?.trim() || "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <LoadingMotion />
              )}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-surface-container-high p-4">
                <p className="text-xs text-white/55">도형</p>
                <p className="mt-2 text-sm text-white/85">{task?.shape || "확인 중"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-container-high p-4">
                <p className="text-xs text-white/55">출발지</p>
                <p className="mt-2 text-sm text-white/85">{task?.startPosition || "상태 불러오는 중"}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-surface-container-high p-4">
                <p className="text-xs text-white/55">현재 상태</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {status === "FAILED" ? "생성 실패" : status === "PROCESSING" ? "생성 중" : "생성 요청 접수"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-surface-container-high p-4">
                <p className="text-xs text-white/55">요청 시각</p>
                <p className="mt-2 text-sm text-white/85">{getCreatedAtLabel(task?.createdAt)}</p>
              </div>
            </div>

            {syncError && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-surface-container-high p-4 text-sm text-white/75">
                {syncError}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-white/10 bg-surface-container-high p-4 text-sm text-white/75">
              페이지를 닫거나 새로고침해도 마이페이지에서 다시 상태를 확인할 수 있습니다.
            </div>

            {status === "FAILED" && !isChecking && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/create">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary-container">다시 생성하기</Button>
                </Link>
                <Link to="/mypage">
                  <Button variant="outline" className="border-white/15 bg-surface-container-high text-white hover:bg-white/10">
                    마이페이지로 이동
                  </Button>
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
    </AppBackground>
  )
}
