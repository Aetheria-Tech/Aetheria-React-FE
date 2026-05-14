import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Edit2, Mail, Plus, User } from "lucide-react"
import AppBackground from "@/components/layouts/app-background"
import GlobalHeader from "@/components/layouts/global-header"
import RouteThumbnail from "@/components/route-thumbnail"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useMyArts } from "@/hooks/use-my-arts"
import { formatDate, formatDistance } from "@/lib/formatters"
import { REPORT_DEMO_ART } from "@/services/art-service"
import { withdrawMe } from "@/services/auth-service"
import { useToast } from "@/context/toast-context"
import type { Art } from "@/types/art"
import type { User as AuthUser } from "@/types/auth"
import {
  GENERATION_STATUS_POLLING_INTERVAL_MS,
  clearCurrentUserTrackedGenerationTasks,
  cleanupExpiredTrackedGenerationTasks,
  getRunningArtTaskStatus,
  isGeneratingTaskStatus,
  listTrackedGenerationTasks,
  syncTrackedGenerationTask,
  toTrackedGenerationArt,
} from "@/services/generation-service"

const GENERATION_STATUS_SYNC_BATCH_SIZE = 3
const TASK_REFRESH_ERROR_NOTICE_INTERVAL_MS = 60_000

type ArtDateSortOrder = "desc" | "asc"

const getProviderLabel = (provider?: AuthUser["provider"]) => {
  if (provider === "kakao") return "카카오"
  if (provider === "google") return "구글"
  return null
}

function ProviderIcon({ provider }: { provider?: AuthUser["provider"] }) {
  if (provider === "kakao") {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FEE500] text-black"
        aria-label="카카오 계정"
        title="카카오 계정"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3C6.477 3 2 6.477 2 10.8c0 2.586 1.563 4.879 4 6.3V21l3.75-2.25c.72.15 1.47.25 2.25.25 5.523 0 10-3.477 10-7.8C22 6.877 17.523 3 12 3Z"
            fill="currentColor"
          />
        </svg>
      </span>
    )
  }

  if (provider === "google") {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white"
        aria-label="구글 계정"
        title="구글 계정"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.47a5.54 5.54 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.75Z"
            fill="#4285F4"
          />
          <path
            d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.05 1.15-3.12 0-5.77-2.1-6.72-4.93H1.27v3.1A12 12 0 0 0 12 24Z"
            fill="#34A853"
          />
          <path d="M5.28 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.27a12 12 0 0 0 0 10.8l4.01-3.1Z" fill="#FBBC05" />
          <path
            d="M12 4.77c1.76 0 3.34.6 4.58 1.8l3.43-3.43C17.95 1.15 15.24 0 12 0A12 12 0 0 0 1.27 6.6l4.01 3.1C6.23 6.87 8.88 4.77 12 4.77Z"
            fill="#EA4335"
          />
        </svg>
      </span>
    )
  }

  return <User className="h-7 w-7 shrink-0 text-white/75" aria-hidden="true" />
}

const getArtworkStatus = (artwork: Art) => {
  if (artwork.generationState === "FAILED") {
    return {
      label: "생성 실패",
      className: "border-destructive/30 bg-destructive-container/35 text-on-destructive-container",
    }
  }

  if (artwork.isGenerationTask) {
    return {
      label: "생성 중",
      className: "border-white/15 bg-surface-container-high text-white/75",
    }
  }

  return {
    label: "생성 완료",
    className: "border-primary/30 bg-white/10 text-white",
  }
}

const toCreatedAtTime = (artwork: Art) => {
  const time = new Date(artwork.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

const compareByCreatedAt = (left: Art, right: Art, order: ArtDateSortOrder) => {
  const leftTime = toCreatedAtTime(left)
  const rightTime = toCreatedAtTime(right)

  if (leftTime !== rightTime) {
    return order === "desc" ? rightTime - leftTime : leftTime - rightTime
  }

  return String(right.id).localeCompare(String(left.id))
}

export default function MyPage() {
  const { user, logout } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const { arts, isLoading, loadArts } = useMyArts()
  const [trackedArts, setTrackedArts] = useState<Art[]>([])
  const trackedPollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const taskRefreshErrorNotifiedAtRef = useRef(0)
  const [isProfileActionsOpen, setIsProfileActionsOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [dateSortOrder, setDateSortOrder] = useState<ArtDateSortOrder>("desc")
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    profileImage: "",
    provider: undefined as AuthUser["provider"],
  })

  useEffect(() => {
    setUserProfile({
      name: user?.name ?? "",
      email: user?.email ?? "",
      profileImage: user?.profileImage ?? "",
      provider: user?.provider,
    })
  }, [user])

  useEffect(() => {
    loadArts().catch(() => undefined)
  }, [loadArts, user])

  const syncTrackedArtStatuses = useCallback(async (isDisposed: () => boolean) => {
    if (isDisposed()) return

    // 생성 중인 task는 localStorage 목록을 서버 상태로 동기화해 마이페이지에 함께 표시한다.
    cleanupExpiredTrackedGenerationTasks()
    const trackedTasks = listTrackedGenerationTasks()
    if (trackedTasks.length === 0) {
      if (!isDisposed()) {
        setTrackedArts([])
      }
      return
    }

    const completedTaskUpdates: Array<{
      trackedTask: (typeof trackedTasks)[number]
      response: Awaited<ReturnType<typeof getRunningArtTaskStatus>>
    }> = []

    const syncedTasks: Array<(typeof trackedTasks)[number] | null> = []
    for (let index = 0; index < trackedTasks.length; index += GENERATION_STATUS_SYNC_BATCH_SIZE) {
      if (isDisposed()) return

      const batch = trackedTasks.slice(index, index + GENERATION_STATUS_SYNC_BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (trackedTask) => {
          if (isDisposed() || !isGeneratingTaskStatus(trackedTask.status)) {
            return { trackedTask, response: null }
          }

          try {
            const response = await getRunningArtTaskStatus(trackedTask.taskId)
            return { trackedTask, response }
          } catch {
            return { trackedTask, response: null }
          }
        }),
      )

      if (isDisposed()) return

      for (const { trackedTask, response } of batchResults) {
        if (!response) {
          syncedTasks.push(trackedTask)
          continue
        }

        if (response.status === "COMPLETED" && response.resultArtId !== null) {
          completedTaskUpdates.push({ trackedTask, response })
          syncedTasks.push(trackedTask)
          continue
        }

        syncedTasks.push(syncTrackedGenerationTask(trackedTask.taskId, response, trackedTask))
      }
    }

    if (isDisposed()) return

    const visibleTasks = syncedTasks.filter((task): task is NonNullable<typeof task> => Boolean(task))

    let completedTaskIds = new Set<string>()

    if (completedTaskUpdates.length > 0) {
      // 완료된 task는 서버 작품 목록 갱신 전까지 추적 카드로 유지해 목록이 비는 순간을 줄인다.
      setTrackedArts(visibleTasks.map(toTrackedGenerationArt))

      const refreshedArts = await loadArts().catch(() => null)

      if (isDisposed()) return

      if (!refreshedArts) {
        const now = Date.now()
        if (now - taskRefreshErrorNotifiedAtRef.current >= TASK_REFRESH_ERROR_NOTICE_INTERVAL_MS) {
          taskRefreshErrorNotifiedAtRef.current = now
          notify("생성 완료된 작품 목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.", "error")
        }
        return
      }

      taskRefreshErrorNotifiedAtRef.current = 0

      const refreshedArtIds = new Set(refreshedArts.map((artwork) => String(artwork.id)))
      completedTaskIds = new Set(
        completedTaskUpdates
          .filter(({ response }) => response.resultArtId !== null && refreshedArtIds.has(String(response.resultArtId)))
          .map(({ trackedTask }) => trackedTask.taskId),
      )
      completedTaskUpdates.forEach(({ trackedTask, response }) => {
        if (response.resultArtId === null || !refreshedArtIds.has(String(response.resultArtId))) return
        syncTrackedGenerationTask(trackedTask.taskId, response, trackedTask)
      })
    }

    // 작품 목록에서 완료 결과가 확인된 task 카드만 제거해 같은 작품이 두 번 보이지 않게 한다.
    const validTasks = visibleTasks.filter((task) => !completedTaskIds.has(task.taskId))
    if (isDisposed()) return

    setTrackedArts(validTasks.map(toTrackedGenerationArt))
  }, [loadArts, notify])

  useEffect(() => {
    let disposed = false

    const clearPollingTimeout = () => {
      if (trackedPollingTimeoutRef.current !== null) {
        clearTimeout(trackedPollingTimeoutRef.current)
        trackedPollingTimeoutRef.current = null
      }
    }

    // 언마운트 후에는 batch 요청과 상태 갱신을 중단한다.
    const isDisposed = () => disposed

    const scheduleNextSync = () => {
      if (disposed) return
      trackedPollingTimeoutRef.current = setTimeout(() => {
        void syncTrackedArtStatuses(isDisposed).finally(scheduleNextSync)
      }, GENERATION_STATUS_POLLING_INTERVAL_MS)
    }

    void syncTrackedArtStatuses(isDisposed).finally(scheduleNextSync)

    return () => {
      disposed = true
      clearPollingTimeout()
    }
  }, [syncTrackedArtStatuses])

  useEffect(() => {
    if (!isWithdrawOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isWithdrawing) {
        setIsWithdrawOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isWithdrawOpen, isWithdrawing])

  const handleWithdraw = async () => {
    if (isWithdrawing) return

    setIsWithdrawing(true)
    try {
      await withdrawMe()
      clearCurrentUserTrackedGenerationTasks()
      logout()
      notify("회원탈퇴가 완료되었습니다.", "success")
      setIsWithdrawOpen(false)
      setIsProfileActionsOpen(false)
      navigate("/", { replace: true })
    } catch (error) {
      console.error("회원탈퇴 처리 중 오류가 발생했습니다:", error)
      notify("회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.", "error")
    } finally {
      setIsWithdrawing(false)
    }
  }

  const visibleArts = useMemo(() => {
    // 서버 작품과 로컬 추적 task가 겹치면 실제 서버 작품을 우선 노출한다.
    const fetchedArtIds = new Set(arts.map((artwork) => artwork.id))
    const fetchedTaskIds = new Set(
      arts
        .map((artwork) => artwork.taskId)
        .filter((taskId): taskId is string => typeof taskId === "string" && taskId.length > 0),
    )
    const filteredTrackedArts = trackedArts.filter((artwork) => {
      if (fetchedArtIds.has(artwork.id)) return false
      return !artwork.taskId || !fetchedTaskIds.has(artwork.taskId)
    })

    const withoutReportDemo = [...filteredTrackedArts, ...arts].filter((artwork) => String(artwork.id) !== String(REPORT_DEMO_ART.id))
    return [REPORT_DEMO_ART, ...withoutReportDemo].sort((left, right) => compareByCreatedAt(left, right, dateSortOrder))
  }, [arts, trackedArts, dateSortOrder])

  const providerLabel = getProviderLabel(userProfile.provider)

  return (
    <AppBackground overlayClassName="bg-black/50">
      <GlobalHeader />

      <main className="flex-1 px-6 pb-8 pt-24">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="rounded-2xl border border-white/15 bg-surface-container/90 p-6 shadow-xl backdrop-blur-md transition-all duration-300">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">프로필</h2>
              <Button
                onClick={() => setIsProfileActionsOpen((current) => !current)}
                variant="ghost"
                size="sm"
                className="gap-2 text-white transition-all duration-300 hover:bg-white/10"
              >
                <Edit2 className="h-4 w-4" />
                계정 관리
              </Button>
            </div>

            <div className="mb-6 flex items-start gap-6">
              {userProfile.profileImage && (
                <img
                  src={userProfile.profileImage || "/placeholder.svg"}
                  alt="프로필 이미지"
                  className="h-20 w-20 rounded-full border-2 border-white object-cover"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <ProviderIcon provider={userProfile.provider} />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">이름</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg text-white">{userProfile.name || "-"}</p>
                    {providerLabel && (
                      <span className="rounded-full border border-outline-variant bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
                        {providerLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-white/75" />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">이메일</p>
                  <p className="text-lg text-white">{userProfile.email || "-"}</p>
                </div>
              </div>

            </div>

            {isProfileActionsOpen && (
              <div className="mt-6 flex justify-end border-t border-white/10 pt-5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsWithdrawOpen(true)}
                  className="text-rose-300 transition-all duration-300 hover:bg-rose-500/10 hover:text-rose-200"
                >
                  회원탈퇴
                </Button>
              </div>
            )}
          </section>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-4xl font-semibold text-white drop-shadow-lg md:text-5xl">내 작품</h1>
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="작품 정렬"
                className="flex rounded-full border border-white/15 bg-surface-container/80 p-1 shadow-lg backdrop-blur-md"
              >
                {[
                  { label: "최신순", value: "desc" as const },
                  { label: "오래된순", value: "asc" as const },
                ].map((option) => {
                  const isSelected = dateSortOrder === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setDateSortOrder(option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                        isSelected
                          ? "bg-white text-black shadow"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <Link to="/create">
                <Button className="gap-2 bg-primary text-primary-foreground transition-all duration-300 hover:bg-primary-container">
                  <Plus className="h-4 w-4" />
                  생성하기
                </Button>
              </Link>
            </div>
          </div>

          {isLoading && <p className="text-white/70">작품을 불러오는 중...</p>}
          {!isLoading && visibleArts.length === 0 && <p className="text-white/70">아직 작품이 없습니다.</p>}

          {visibleArts.length > 0 && (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleArts.map((artwork) => {
                const status = getArtworkStatus(artwork)
                const artworkPath =
                  artwork.isGenerationTask && artwork.taskId ? `/mypage/tasks/${artwork.taskId}` : `/mypage/${artwork.id}`

                return (
                  <article
                    key={artwork.id}
                    className="group overflow-hidden rounded-2xl border border-white/15 bg-surface-container/90 shadow-xl backdrop-blur-md transition-all duration-300 hover:bg-surface-container-high"
                  >
                    <Link to={artworkPath} aria-label={artwork.title} className="block">
                      <div
                        data-testid={`art-card-map-${artwork.id}`}
                        className="relative aspect-square overflow-hidden bg-surface-container-lowest"
                      >
                        <div className="absolute left-3 top-3 z-10">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>

                        {artwork.gpxData ? (
                          <RouteThumbnail gpxData={artwork.gpxData} title={artwork.title} />
                        ) : artwork.isGenerationTask ? (
                          <div className="flex h-full items-center justify-center bg-surface-container-lowest p-5">
                            <img
                              src="/favicon.png"
                              alt=""
                              aria-hidden="true"
                              className="h-16 w-16 animate-bounce object-contain opacity-90 drop-shadow-[0_0_18px_rgba(255,255,255,0.28)] motion-reduce:animate-none"
                            />
                          </div>
                        ) : (
                          <img
                            src={artwork.imageUrl || "/placeholder.svg"}
                            alt={artwork.title}
                            className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
                          />
                        )}
                      </div>
                    </Link>

                    <div className="space-y-2 p-4">
                      <h3 className="truncate text-lg font-semibold text-white">{artwork.title}</h3>
                      <p className="min-h-10 text-sm text-white/65">{artwork.content?.trim() || "-"}</p>
                      <div className="flex items-center justify-between text-sm text-gray-300">
                        <span>{artwork.isGenerationTask ? (artwork.startAddress?.trim() || "상태 확인 가능") : formatDistance(artwork.distanceKm)}</span>
                        <span>{formatDate(artwork.createdAt)}</span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          )}
        </div>
      </main>

      {isWithdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-title"
            className="w-full max-w-md rounded-2xl border border-white/15 bg-surface-container p-6 text-white shadow-2xl"
          >
            <h2 id="withdraw-title" className="mb-3 text-xl font-semibold">
              회원탈퇴
            </h2>
            <p className="mb-6 text-sm text-white/70">
              정말 회원탈퇴를 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsWithdrawOpen(false)}
                className="text-white hover:bg-white/10"
                disabled={isWithdrawing}
                autoFocus
              >
                취소
              </Button>
              <Button
                onClick={handleWithdraw}
                className="bg-rose-500 text-white hover:bg-rose-600"
                disabled={isWithdrawing}
              >
                {isWithdrawing ? "처리 중..." : "회원탈퇴"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppBackground>
  )
}
