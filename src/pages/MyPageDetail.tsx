import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Download } from "lucide-react"
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
      await patchRunningArt(id, { title: nextTitle, content: draftContent })
      setArt((prev) => (prev ? { ...prev, title: nextTitle, content: draftContent } : null))
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
    <div className="min-h-screen bg-background text-white">
      <GlobalHeader />
      <div className="mx-auto max-w-3xl space-y-6 px-6 pb-10 pt-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/mypage">
              <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4" />
                목록으로
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold">작품 상세</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive-container/30 hover:text-destructive"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={!canManageArt || isLoading || isDeleting}
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>

        {isLoading && <p className="text-white/70">작품을 불러오는 중...</p>}

        {!isLoading && !art && (
          <div className="space-y-4 rounded-2xl border border-white/15 bg-surface-container p-6 backdrop-blur-md">
            <p className="text-white/80">작품을 찾을 수 없습니다.</p>
          </div>
        )}

        {art && (
          <div className="space-y-6 rounded-2xl border border-white/15 bg-surface-container p-6 backdrop-blur-md">
            <div className="space-y-2">
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
                    className="border-white/15 bg-surface-container-high text-2xl font-semibold text-white"
                    disabled={isSavingContent}
                  />
                </div>
              ) : (
                <h2 className="text-2xl font-semibold">{art.title}</h2>
              )}
              <p className="text-white/70">거리: {formatDistance(art.distanceKm)}</p>
              <p className="text-white/60">생성일: {formatDateTime(art.createdAt)}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/80">설명</span>
                {canManageArt && !isEditingContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10"
                    onClick={handleStartEditContent}
                  >
                    제목/설명 수정
                  </Button>
                )}
              </div>
              {isEditingContent ? (
                <div className="space-y-2">
                  <label htmlFor="art-content-editor" className="sr-only">
                    설명 입력
                  </label>
                  <textarea
                    id="art-content-editor"
                    aria-label="설명 입력"
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-white/15 bg-surface-container-high px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/50"
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
                <p className="text-white/70 whitespace-pre-wrap">{art.content?.trim() || "설명이 없습니다."}</p>
              )}
            </div>


            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/80">경로</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-white/15 bg-surface-container-high text-white hover:bg-white/10"
                  onClick={handleDownloadGpx}
                  disabled={!art.gpxData}
                >
                  <Download className="h-4 w-4" />
                  GPX 다운로드
                </Button>
              </div>
              <div className="h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-surface-container-high md:h-[420px]">
                {art.gpxData ? (
                  <MapComponent
                    center={DETAIL_MAP_CENTER}
                    gpxData={art.gpxData}
                    routeColor="#ef4444"
                    onLocationFound={() => undefined}
                    showLocationButton={false}
                    displayOnly
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl bg-surface-container-high text-sm text-white/60">
                    표시할 경로 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {isSampleArt && <p className="text-white/60 text-sm">샘플 작품은 읽기 전용으로 제공됩니다.</p>}
          </div>
        )}
      </div>

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="w-full max-w-md rounded-2xl border border-white/15 bg-surface-container p-6 text-white shadow-2xl"
          >
            <h2 id="delete-title" className="text-xl font-semibold mb-3">
              작품 삭제
            </h2>
            <p className="text-white/70 text-sm mb-6">
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
              <Button onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
