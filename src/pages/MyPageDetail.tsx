import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CalendarDays, Download, Edit3, FileText, MapPin, Route, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import MapComponent from "@/components/map-component"
import GlobalHeader from "@/components/layouts/global-header"
import { useArtDetail } from "@/hooks/use-art-detail"
import { useToast } from "@/context/toast-context"
import { formatDateTime, formatDistance } from "@/lib/formatters"
import { sanitizeGpxFileName } from "@/lib/gpx-download"
import { deleteRunningArt, patchRunningArt } from "@/services/art-service"

const DETAIL_MAP_CENTER: [number, number] = [37.5665, 126.978]

export default function MyPageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { art, isLoading, loadArt, setArt } = useArtDetail()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftContent, setDraftContent] = useState("")
  const [isSavingContent, setIsSavingContent] = useState(false)

  useEffect(() => {
    if (id) {
      loadArt(id).catch(() => undefined)
    }
  }, [id, loadArt])

  const isSampleArt = useMemo(() => String(art?.id ?? "") === "-1", [art])
  // BE 상세 조회가 이미 소유자 검증을 통과한 리소스만 반환한다.
  const canManageArt = Boolean(art && !isSampleArt)

  useEffect(() => {
    if (isEditingContent) return
    setDraftTitle(art?.title ?? "")
    setDraftContent(art?.content ?? "")
  }, [art, isEditingContent])

  const handleDelete = async () => {
    if (!id || isDeleting) return

    setIsDeleting(true)
    try {
      await deleteRunningArt(id)
      setIsDeleteConfirmOpen(false)
      notify("작품이 삭제되었습니다.", "success")
      navigate("/mypage", { replace: true })
    } catch (error) {
      console.error("작품 삭제 실패:", error)
      notify("작품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.", "error")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStartEditContent = () => {
    if (!art || !canManageArt) return
    setIsEditingContent(true)
  }

  const handleCancelEditContent = () => {
    if (isSavingContent) return
    setIsEditingContent(false)
  }

  const handleSaveContent = async () => {
    if (!id || !art || isSavingContent) return

    const nextTitle = draftTitle.trim()
    if (!nextTitle) {
      notify("제목을 입력해주세요.", "error")
      return
    }

    setIsSavingContent(true)
    try {
      const nextContent = draftContent.trim()
      await patchRunningArt(id, { title: nextTitle, content: nextContent })
      setArt((prev) => (prev ? { ...prev, title: nextTitle, content: nextContent } : null))
      setIsEditingContent(false)
      notify("작품 정보가 저장되었습니다.", "success")
    } catch (error) {
      console.error("작품 정보 저장 실패:", error)
      notify("작품 정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "error")
    } finally {
      setIsSavingContent(false)
    }
  }

  const handleDownloadGpx = () => {
    const gpxData = art?.gpxData?.trim()
    if (!art || !gpxData) {
      notify("다운로드할 GPX 파일이 없습니다.", "error")
      return
    }

    const blob = new Blob([gpxData], { type: "application/gpx+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = `${sanitizeGpxFileName(art.title)}.gpx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-white">
      <GlobalHeader />

      <main className="relative min-h-screen pt-16">
        {isLoading && (
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
            <div className="rounded-3xl border border-white/15 bg-surface-container/90 px-6 py-5 text-white/75 shadow-2xl backdrop-blur-md">
              작품을 불러오는 중...
            </div>
          </div>
        )}

        {!isLoading && !art && (
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
            <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/15 bg-surface-container/90 p-6 shadow-2xl backdrop-blur-md">
              <p className="text-white/80">작품을 찾을 수 없습니다.</p>
              <Link to="/mypage">
                <Button variant="outline" className="border-white/15 bg-surface-container-high text-white hover:bg-white/10">
                  목록으로
                </Button>
              </Link>
            </div>
          </div>
        )}

        {art && (
          <>
            <section
              aria-label="러닝 아트 경로 지도"
              className="absolute inset-0 z-0 pt-16 [&_.leaflet-container]:!rounded-none [&_.leaflet-control-attribution]:!bg-black/55 [&_.leaflet-control-attribution]:!text-white/60 [&_.leaflet-tile]:brightness-[0.34] [&_.leaflet-tile]:contrast-[1.18] [&_.leaflet-tile]:saturate-[0.65]"
            >
              {art.gpxData ? (
                <MapComponent
                  center={DETAIL_MAP_CENTER}
                  gpxData={art.gpxData}
                  routeColor="var(--on-surface)"
                  onLocationFound={() => undefined}
                  showLocationButton={false}
                  displayOnly
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-surface-container-lowest text-sm text-white/60">
                  표시할 경로 데이터가 없습니다.
                </div>
              )}
            </section>

            <div className="pointer-events-none absolute inset-0 z-[500] pt-16">
              <div className="h-full bg-[radial-gradient(circle_at_42%_48%,rgba(229,226,225,0.18),transparent_9%),radial-gradient(circle_at_45%_48%,rgba(229,226,225,0.1),transparent_25%),linear-gradient(90deg,rgba(0,0,0,0.7),rgba(0,0,0,0.14)_46%,rgba(0,0,0,0.55))]" />
            </div>

            <div className="fixed inset-x-4 bottom-5 z-[1200] flex justify-center lg:inset-x-auto lg:bottom-auto lg:right-8 lg:top-1/2 lg:w-[430px] lg:-translate-y-1/2">
              <aside className="max-h-[calc(100vh-6rem)] w-full max-w-[430px] overflow-y-auto rounded-[1.75rem] border border-white/15 bg-surface-container/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-6 lg:max-h-[calc(100vh-8rem)]">
                <div className="flex items-center justify-between gap-3">
                  <Link to="/mypage">
                    <Button variant="ghost" size="sm" className="gap-2 text-white/80 hover:bg-white/10 hover:text-white">
                      <ArrowLeft className="h-4 w-4" />
                      목록으로
                    </Button>
                  </Link>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/70">
                    작품 상세
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {isEditingContent ? (
                    <div className="space-y-2">
                      <label htmlFor="art-title-editor" className="text-sm font-semibold text-white/80">
                        제목
                      </label>
                      <Input
                        id="art-title-editor"
                        aria-label="제목 입력"
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        className="h-12 rounded-2xl border-white/15 bg-surface-container-high text-2xl font-semibold text-white"
                        disabled={isSavingContent}
                      />
                    </div>
                  ) : (
                    <h1 className="break-words text-3xl font-semibold leading-tight text-white">{art.title}</h1>
                  )}

                  <div className="flex items-start gap-2 text-sm text-white/60">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="line-clamp-2">{art.startAddress?.trim() || "출발지 정보 없음"}</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-white/10 py-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      <Route className="h-3.5 w-3.5" />
                      Distance
                    </div>
                    <p className="mt-1 text-xl font-semibold text-white">{formatDistance(art.distanceKm)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      <FileText className="h-3.5 w-3.5" />
                      Theme
                    </div>
                    <p className="mt-1 truncate text-xl font-semibold text-white">{art.theme || "-"}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Created
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-5 text-white/85">{formatDateTime(art.createdAt)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      <MapPin className="h-3.5 w-3.5" />
                      Status
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-5 text-white/85">
                      {isSampleArt ? "샘플" : canManageArt ? "관리 가능" : "읽기 전용"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-white/80">작품 설명</h2>
                    {canManageArt && !isEditingContent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-white/80 hover:bg-white/10 hover:text-white"
                        onClick={handleStartEditContent}
                      >
                        <Edit3 className="h-4 w-4" />
                        제목/설명 수정
                      </Button>
                    )}
                  </div>

                  {isEditingContent ? (
                    <div className="space-y-3">
                      <label htmlFor="art-content-editor" className="sr-only">
                        설명 입력
                      </label>
                      <textarea
                        id="art-content-editor"
                        aria-label="설명 입력"
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        rows={5}
                        className="w-full resize-none rounded-2xl border border-white/15 bg-surface-container-high px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/30"
                        disabled={isSavingContent}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEditContent}
                          disabled={isSavingContent}
                          className="text-white hover:bg-white/10"
                        >
                          취소
                        </Button>
                        <Button size="sm" onClick={handleSaveContent} disabled={isSavingContent}>
                          {isSavingContent ? "저장 중..." : "변경사항 저장"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="max-h-36 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-white/70">
                      {art.content?.trim() || "설명이 없습니다."}
                    </p>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    variant="outline"
                    className="h-12 w-full gap-2 border-white/10 bg-white text-background hover:bg-white/90"
                    onClick={handleDownloadGpx}
                    disabled={!art.gpxData}
                  >
                    <Download className="h-4 w-4" />
                    GPX 다운로드
                  </Button>

                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    {isSampleArt ? (
                      <p className="text-sm text-white/55">샘플 작품은 읽기 전용으로 제공됩니다.</p>
                    ) : (
                      <span className="text-sm text-white/45">작품 관리</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:bg-destructive-container/30 hover:text-destructive"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      disabled={!canManageArt || isLoading || isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "삭제 중..." : "삭제"}
                    </Button>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="w-full max-w-md rounded-3xl border border-white/15 bg-surface-container p-6 text-white shadow-2xl"
          >
            <h2 id="delete-title" className="mb-3 text-xl font-semibold">
              작품 삭제
            </h2>
            <p className="mb-6 text-sm leading-6 text-white/70">
              정말 이 작품을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="text-white hover:bg-white/10"
                disabled={isDeleting}
                autoFocus
              >
                취소
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
