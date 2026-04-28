import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Edit2, Mail, MessageSquareText, Plus, User } from "lucide-react"
import AppBackground from "@/components/layouts/app-background"
import GlobalHeader from "@/components/layouts/global-header"
import RouteThumbnail from "@/components/route-thumbnail"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useMyArts } from "@/hooks/use-my-arts"
import { formatDate, formatDistance } from "@/lib/formatters"
import { updateMyProfile, withdrawMe } from "@/services/auth-service"
import { useToast } from "@/context/toast-context"
import type { Art } from "@/types/art"
import {
  GENERATION_STATUS_POLLING_INTERVAL_MS,
  cleanupExpiredTrackedGenerationTasks,
  getRunningArtTaskStatus,
  isGeneratingTaskStatus,
  listTrackedGenerationTasks,
  syncTrackedGenerationTask,
  toTrackedGenerationArt,
} from "@/services/generation-service"

const GENERATION_STATUS_SYNC_BATCH_SIZE = 3
const TASK_REFRESH_ERROR_NOTICE_INTERVAL_MS = 60_000

const getArtworkStatus = (artwork: Art) => {
  if (artwork.generationState === "FAILED") {
    return {
      label: "생성 실패",
      className: "border-rose-300/20 bg-rose-500/15 text-rose-100",
    }
  }

  if (artwork.isGenerationTask) {
    return {
      label: "생성 중",
      className: "border-amber-300/20 bg-amber-400/15 text-amber-100",
    }
  }

  return {
    label: "생성 완료",
    className: "border-emerald-300/20 bg-emerald-400/15 text-emerald-100",
  }
}

export default function MyPage() {
  const { user, logout, updateUser } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const { arts, isLoading, loadArts } = useMyArts()
  const [trackedArts, setTrackedArts] = useState<Art[]>([])
  const trackedPollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const taskRefreshErrorNotifiedAtRef = useRef(0)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    statusMessage: "",
    profileImage: "",
  })

  useEffect(() => {
    setUserProfile({
      name: user?.name ?? "",
      email: user?.email ?? "",
      statusMessage: user?.statusMessage ?? "",
      profileImage: user?.profileImage ?? "",
    })
  }, [user])

  useEffect(() => {
    loadArts({ includeSample: Boolean(user) }).catch(() => undefined)
  }, [loadArts, user])

  const syncTrackedArtStatuses = useCallback(async () => {
    cleanupExpiredTrackedGenerationTasks()
    const trackedTasks = listTrackedGenerationTasks()
    if (trackedTasks.length === 0) {
      setTrackedArts([])
      return
    }

    const completedTaskUpdates: Array<{
      trackedTask: (typeof trackedTasks)[number]
      response: Awaited<ReturnType<typeof getRunningArtTaskStatus>>
    }> = []

    const syncedTasks: Array<(typeof trackedTasks)[number] | null> = []
    for (let index = 0; index < trackedTasks.length; index += GENERATION_STATUS_SYNC_BATCH_SIZE) {
      const batch = trackedTasks.slice(index, index + GENERATION_STATUS_SYNC_BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (trackedTask) => {
          if (!isGeneratingTaskStatus(trackedTask.status)) {
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

    const visibleTasks = syncedTasks.filter((task): task is NonNullable<typeof task> => Boolean(task))

    if (completedTaskUpdates.length > 0) {
      setTrackedArts(visibleTasks.map(toTrackedGenerationArt))

      const didRefreshArts = await loadArts({ includeSample: Boolean(user) })
        .then(() => true)
        .catch(() => false)

      if (!didRefreshArts) {
        const now = Date.now()
        if (now - taskRefreshErrorNotifiedAtRef.current >= TASK_REFRESH_ERROR_NOTICE_INTERVAL_MS) {
          taskRefreshErrorNotifiedAtRef.current = now
          notify("생성 완료된 작품 목록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.", "error")
        }
        return
      }

      taskRefreshErrorNotifiedAtRef.current = 0

      completedTaskUpdates.forEach(({ trackedTask, response }) => {
        syncTrackedGenerationTask(trackedTask.taskId, response, trackedTask)
      })
    }

    const completedTaskIds = new Set(completedTaskUpdates.map(({ trackedTask }) => trackedTask.taskId))
    const validTasks = visibleTasks.filter((task) => !completedTaskIds.has(task.taskId))
    setTrackedArts(validTasks.map(toTrackedGenerationArt))
  }, [loadArts, notify, user])

  useEffect(() => {
    let disposed = false

    const clearPollingTimeout = () => {
      if (trackedPollingTimeoutRef.current !== null) {
        clearTimeout(trackedPollingTimeoutRef.current)
        trackedPollingTimeoutRef.current = null
      }
    }

    const scheduleNextSync = () => {
      if (disposed) return
      trackedPollingTimeoutRef.current = setTimeout(() => {
        void syncTrackedArtStatuses().finally(scheduleNextSync)
      }, GENERATION_STATUS_POLLING_INTERVAL_MS)
    }

    void syncTrackedArtStatuses().finally(scheduleNextSync)

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

  const resetProfileForm = () => {
    setUserProfile({
      name: user?.name ?? "",
      email: user?.email ?? "",
      statusMessage: user?.statusMessage ?? "",
      profileImage: user?.profileImage ?? "",
    })
  }

  const handleCancelProfileEdit = () => {
    if (isSavingProfile) return
    resetProfileForm()
    setIsEditingProfile(false)
  }

  const handleSaveProfile = async () => {
    if (isSavingProfile) return

    const nickname = userProfile.name.trim()
    const statusMessage = userProfile.statusMessage.trim()

    if (nickname.length < 2 || nickname.length > 20) {
      notify("닉네임은 2자 이상 20자 이하로 입력해 주세요.", "error")
      return
    }

    if (statusMessage.length > 100) {
      notify("상태 메시지는 100자 이하로 입력해 주세요.", "error")
      return
    }

    setIsSavingProfile(true)
    try {
      const updatedUser = await updateMyProfile({
        nickname,
        statusMessage,
      })

      updateUser(updatedUser)
      setUserProfile({
        name: updatedUser.name,
        email: updatedUser.email,
        statusMessage: updatedUser.statusMessage ?? "",
        profileImage: updatedUser.profileImage ?? "",
      })
      setIsEditingProfile(false)
      notify("프로필이 저장되었습니다.", "success")
    } catch (error) {
      console.error("프로필 저장 실패:", error)
      notify("프로필 저장에 실패했습니다. 입력값을 확인하고 다시 시도해주세요.", "error")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleWithdraw = async () => {
    if (isWithdrawing) return

    setIsWithdrawing(true)
    try {
      await withdrawMe()
      logout()
      notify("회원탈퇴가 완료되었습니다.", "success")
      setIsWithdrawOpen(false)
      navigate("/", { replace: true })
    } catch (error) {
      console.error("회원탈퇴 처리 중 오류가 발생했습니다:", error)
      notify("회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.", "error")
    } finally {
      setIsWithdrawing(false)
    }
  }

  const visibleArts = useMemo(() => {
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

    return [...filteredTrackedArts, ...arts]
  }, [arts, trackedArts])

  return (
    <AppBackground overlayClassName="bg-black/50">
      <GlobalHeader />

      <main className="flex-1 px-6 pb-8 pt-24">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md transition-all duration-300">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">프로필</h2>
              {!isEditingProfile ? (
                <Button
                  onClick={() => setIsEditingProfile(true)}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-indigo-300 transition-all duration-300 hover:bg-white/10 hover:text-indigo-200"
                >
                  <Edit2 className="h-4 w-4" />
                  수정
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveProfile}
                    size="sm"
                    disabled={isSavingProfile}
                    className="bg-indigo-500 text-white transition-all duration-300 hover:bg-indigo-600"
                  >
                    {isSavingProfile ? "저장 중..." : "저장"}
                  </Button>
                  <Button
                    onClick={handleCancelProfileEdit}
                    variant="ghost"
                    size="sm"
                    disabled={isSavingProfile}
                    className="text-white transition-all duration-300 hover:bg-white/10"
                  >
                    취소
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-6 flex items-start gap-6">
              {userProfile.profileImage && (
                <img
                  src={userProfile.profileImage || "/placeholder.svg"}
                  alt="프로필 이미지"
                  className="h-20 w-20 rounded-full border-2 border-indigo-300 object-cover"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-indigo-300" />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">이름</p>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      aria-label="닉네임 입력"
                      value={userProfile.name}
                      onChange={(event) => setUserProfile({ ...userProfile, name: event.target.value })}
                      maxLength={20}
                      className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-lg text-white">{userProfile.name || "-"}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-indigo-300" />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">이메일</p>
                  <p className="text-lg text-white">{userProfile.email || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 md:col-span-2">
                <MessageSquareText className="mt-1 h-5 w-5 text-indigo-300" />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">상태 메시지</p>
                  {isEditingProfile ? (
                    <textarea
                      aria-label="상태 메시지 입력"
                      value={userProfile.statusMessage}
                      onChange={(event) => setUserProfile({ ...userProfile, statusMessage: event.target.value })}
                      rows={3}
                      maxLength={100}
                      className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-lg text-white">{userProfile.statusMessage?.trim() || "-"}</p>
                  )}
                </div>
              </div>
            </div>

            {isEditingProfile && (
              <div className="mt-6 flex justify-end">
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

          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-semibold text-white drop-shadow-lg md:text-5xl">내 작품</h1>
            <Link to="/create">
              <Button className="gap-2 bg-indigo-500 text-white transition-all duration-300 hover:bg-indigo-600">
                <Plus className="h-4 w-4" />
                생성하기
              </Button>
            </Link>
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
                    className="group overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-md transition-all duration-300 hover:bg-white/15"
                  >
                    <Link to={artworkPath} aria-label={artwork.title} className="block">
                      <div
                        data-testid={`art-card-map-${artwork.id}`}
                        className="relative aspect-square overflow-hidden bg-slate-950/40"
                      >
                        <div className="absolute left-3 top-3 z-10">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>

                        {artwork.gpxData ? (
                          <RouteThumbnail gpxData={artwork.gpxData} title={artwork.title} />
                        ) : artwork.isGenerationTask ? (
                          <div className="flex h-full flex-col justify-between p-5">
                            <div className="space-y-3">
                              <div className="h-3 w-24 rounded-full bg-white/10" />
                              <div className="h-3 w-32 rounded-full bg-white/10" />
                            </div>
                            <div className="space-y-3">
                              <div className="h-px w-full bg-white/10" />
                              <div className="flex items-center justify-center gap-2">
                                {[0, 1, 2].map((index) => (
                                  <span
                                    key={index}
                                    className="h-2.5 w-2.5 rounded-full bg-brand animate-bounce"
                                    style={{ animationDelay: `${index * 120}ms` }}
                                  />
                                ))}
                              </div>
                            </div>
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
            className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0a0f29] p-6 text-white shadow-2xl"
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
