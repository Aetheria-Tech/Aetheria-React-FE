import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { AlertCircle, ArrowLeft, Check, Loader2, RefreshCcw, Trash2 } from "lucide-react"
import GlobalHeader from "@/components/layouts/global-header"
import ShootingStars from "@/components/shooting-stars"
import { Button } from "@/components/ui/button"
import { useToast } from "@/context/toast-context"
import { useCreateArt } from "@/hooks/use-create-art"
import { formatDateTime } from "@/lib/formatters"
import { env } from "@/services/env"
import {
  DEFAULT_TRACKED_TASK_SHAPE,
  GENERATION_STATUS_POLLING_INTERVAL_MS,
  getRunningArtTaskStatus,
  getTrackedGenerationTask,
  isGeneratingTaskStatus,
  removeTrackedGenerationTask,
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
const PROCESSING_SAFE_REVIEW_DELAY_MS = 15000

const getSseConnectTimeoutMs = () => {
  const timeoutMs = Number(env.generationSseConnectTimeoutMs)
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_SSE_CONNECT_TIMEOUT_MS
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

const generationSteps = [
  {
    label: "요청 확인",
    description: "입력한 도형, 출발지, 거리 조건을 확인하고 있어요.",
  },
  {
    label: "경로 후보 설계",
    description: "도로망 위에서 달릴 수 있는 러닝 아트 경로를 그리고 있어요.",
  },
  {
    label: "거리 안전 검토",
    description: "거리 오차와 이동 안전성을 함께 검토하고 있어요.",
  },
  {
    label: "결과 저장",
    description: "완성된 러닝 아트를 마이페이지에 저장하고 있어요.",
  },
] as const

const getActiveStepIndex = (status: RunningArtTaskStatus | null, createdAt?: string | null, now = Date.now()) => {
  if (status === "COMPLETED") return generationSteps.length - 1
  if (status === "PROCESSING") {
    const startedAt = Date.parse(createdAt ?? "")
    return Number.isFinite(startedAt) && now - startedAt >= PROCESSING_SAFE_REVIEW_DELAY_MS ? 2 : 1
  }
  if (status === "FAILED") return 1
  return 0
}

export default function GenerationStatusPage() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { createArt, isLoading: isRetrying } = useCreateArt()
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
  const [progressNow, setProgressNow] = useState(() => Date.now())

  const taskRef = useRef(task)
  const statusRef = useRef(status)

  useEffect(() => {
    taskRef.current = task
  }, [task])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (status !== "PROCESSING") return

    const progressTimer = window.setInterval(() => setProgressNow(Date.now()), 1000)
    return () => window.clearInterval(progressTimer)
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

  const handleRetryTask = useCallback(async () => {
    const currentTask = taskRef.current
    const startPosition = currentTask?.startPosition?.trim() ?? ""
    const shape = currentTask?.shape?.trim() ?? ""
    const proficiency = currentTask?.proficiency

    if (!startPosition || !shape || !proficiency) {
      notify("다시 생성할 작업 정보를 찾을 수 없습니다.", "error")
      return
    }

    try {
      const response = await createArt({
        startPosition,
        shape,
        proficiency,
      })

      if (taskId) {
        removeTrackedGenerationTask(taskId)
      }

      closeSseSubscription()
      stopPolling()
      navigate(`/mypage/tasks/${response.taskId}`, { replace: true })
    } catch {
      // useCreateArt에서 실패 토스트를 표시한다.
    }
  }, [closeSseSubscription, createArt, navigate, notify, stopPolling, taskId])

  const handleDeleteTask = useCallback(() => {
    if (taskId) {
      removeTrackedGenerationTask(taskId)
    }

    closeSseSubscription()
    stopPolling()
    notify("생성 작업을 삭제했습니다.", "success")
    navigate("/mypage", { replace: true })
  }, [closeSseSubscription, navigate, notify, stopPolling, taskId])

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

  const activeStepIndex = getActiveStepIndex(status, task?.createdAt, progressNow)
  const currentStep = generationSteps[Math.min(activeStepIndex, generationSteps.length - 1)]
  const currentStepTitle = status === "FAILED" ? "생성에 실패했습니다" : `${currentStep.label} 중`
  const currentStepDescription =
    status === "FAILED"
      ? task?.errorMessage?.trim() || "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      : currentStep.description
  const heroDescription =
    status === "FAILED" ? "요청을 완료하지 못했습니다. 아래 버튼에서 다음 작업을 선택해 주세요." : currentStepDescription
  const progressPercent = Math.min(
    100,
    Math.max(0, (activeStepIndex / Math.max(1, generationSteps.length - 1)) * 100),
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <ShootingStars />
      <div className="relative z-10 flex min-h-screen flex-col">
        <GlobalHeader />

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 py-24 text-center sm:px-8">
          <section className="w-full">
            <div className="mb-8 space-y-5">
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{currentStepTitle}</h1>
              <p className="mx-auto max-w-xl text-sm leading-7 text-white/60 sm:text-base">{heroDescription}</p>
            </div>

            <div className="relative mx-auto mb-12 flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
              {status === "FAILED" ? (
                <>
                  <div className="absolute inset-0 rounded-full border border-destructive/10" />
                  <div className="absolute inset-16 rounded-full border border-destructive/25" />
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-destructive/35 bg-destructive-container/50 text-destructive shadow-[0_0_42px_rgba(255,68,68,0.22)]">
                    <AlertCircle className="h-9 w-9" />
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="absolute inset-0 rounded-full border border-white/10 animate-ping"
                    style={{ animationDuration: "4.8s" }}
                  />
                  <div
                    className="absolute inset-16 rounded-full border border-white/35 animate-ping"
                    style={{ animationDelay: "1s", animationDuration: "4.8s" }}
                  />
                  <div className="absolute inset-20 rounded-full border border-white/30 border-l-transparent border-r-transparent animate-spin [animation-duration:7s]" />
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/70 shadow-[0_0_44px_rgba(255,255,255,0.35)]">
                    <div className="h-6 w-6 rounded-full bg-black shadow-[inset_0_0_12px_rgba(255,255,255,0.18)]" />
                  </div>
                </>
              )}
            </div>

            <div className="mx-auto mb-14 w-full max-w-4xl rounded-2xl border border-white/10 bg-white/[0.025] p-7 text-left sm:p-8">
              <dl className="grid grid-cols-1 gap-7 md:grid-cols-4">
                <div className="space-y-3">
                  <dt className="text-sm font-semibold text-white/45">요청 도형</dt>
                  <dd className="truncate text-base font-medium text-white">{task?.shape || "확인 중"}</dd>
                </div>
                <div className="space-y-3 md:col-span-2">
                  <dt className="text-sm font-semibold text-white/45">출발지</dt>
                  <dd className="line-clamp-2 text-base font-medium text-white" title={task?.startPosition}>
                    {task?.startPosition || "상태 불러오는 중"}
                  </dd>
                </div>
                <div className="space-y-3">
                  <dt className="text-sm font-semibold text-white/45">요청 시각</dt>
                  <dd className="text-base font-medium text-white">{getCreatedAtLabel(task?.createdAt)}</dd>
                </div>
              </dl>

              {status === "FAILED" && (
                <div className="mt-6 rounded-xl border border-destructive/25 bg-destructive-container/25 p-4 text-sm leading-6 text-destructive">
                  {currentStepDescription}
                </div>
              )}

              {syncError && status !== "FAILED" && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/70">
                  {syncError}
                </div>
              )}
            </div>

            <div className="mx-auto w-full max-w-5xl">
              <div className="relative">
                <div className="absolute left-6 right-6 top-4 hidden h-px bg-white/20 md:block" />
                <div
                  className="absolute left-6 top-4 hidden h-px bg-white transition-all duration-700 md:block"
                  style={{ width: `calc((100% - 3rem) * ${progressPercent / 100})` }}
                />
                <ol className="relative grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4">
                  {generationSteps.map((step, index) => {
                    const isFailedStep = status === "FAILED" && index === activeStepIndex
                    const isActiveStep = status !== "FAILED" && index === activeStepIndex
                    const isCompletedStep = status !== "FAILED" && index < activeStepIndex

                    return (
                      <li key={step.label} className="flex flex-col items-center bg-black px-2 text-center">
                        <div
                          className={`relative z-10 mb-4 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                            isFailedStep
                              ? "border-destructive/70 bg-destructive-container/60 text-destructive"
                              : isCompletedStep
                                ? "border-white bg-white text-black"
                                : isActiveStep
                                  ? "border-white bg-black text-white shadow-[0_0_18px_rgba(255,255,255,0.36)]"
                                  : "border-white/15 bg-black text-white/30"
                          }`}
                        >
                          {isFailedStep ? (
                            <AlertCircle className="h-4 w-4" />
                          ) : isCompletedStep ? (
                            <Check className="h-4 w-4" />
                          ) : isActiveStep ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            isFailedStep
                              ? "text-destructive"
                              : isActiveStep || isCompletedStep
                                ? "text-white"
                                : "text-white/35"
                          }`}
                        >
                          {step.label}
                        </p>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </div>

            <div className="mx-auto mt-12 flex w-full max-w-lg flex-col items-center gap-3">
              <p className="whitespace-nowrap text-xs leading-6 text-white/45 sm:text-sm">
                페이지를 떠나도 생성은 계속 진행됩니다. 마이페이지에서 확인할 수 있어요.
              </p>

              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Link to="/mypage" className="w-full sm:flex-1">
                  <Button className="h-12 w-full rounded-full bg-white px-8 text-black hover:bg-white/90">
                    <ArrowLeft className="h-4 w-4" />
                    마이페이지로 이동
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => void syncTaskStatus()}
                  className="h-12 w-full rounded-full border-white/15 bg-transparent px-8 text-white hover:bg-white/10 sm:flex-1"
                >
                  <RefreshCcw className="h-4 w-4" />
                  상태 다시 확인
                </Button>
              </div>

              {status === "FAILED" && !isChecking && (
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => void handleRetryTask()}
                    disabled={isRetrying}
                    className="h-12 w-full rounded-full bg-white text-black hover:bg-white/90 sm:flex-1"
                  >
                    {isRetrying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        재요청 중...
                      </>
                    ) : (
                      "다시 생성하기"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDeleteTask}
                    disabled={isRetrying}
                    className="h-12 w-full rounded-full border-destructive/30 bg-destructive-container/35 text-on-destructive-container hover:bg-destructive-container/50 hover:text-on-destructive-container sm:flex-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    작업 삭제
                  </Button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
