import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useArtDetail } from "@/hooks/use-art-detail"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/context/toast-context"
import { formatDateTime, formatDistance } from "@/lib/formatters"
import { isDevEnvironment } from "@/lib/runtime"
import { deleteRunningArt, patchRunningArt } from "@/services/art-service"

export default function MyPageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { art, isLoading, loadArt, updateShare, setArt } = useArtDetail()
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [draftContent, setDraftContent] = useState("")
  const [isSavingContent, setIsSavingContent] = useState(false)

  useEffect(() => {
    if (id) {
      loadArt(id).catch(() => undefined)
    }
  }, [id, loadArt])

  const isOwner = useMemo(() => Boolean(art && user && art.ownerId === user.id), [art, user])
  const canManageArt = isOwner || isDevEnvironment()
  const shareUrl = typeof window !== "undefined" && art ? `${window.location.origin}/share/${art.id}` : ""

  useEffect(() => {
    if (isEditingContent) return
    setDraftContent(art?.content ?? "")
  }, [art, isEditingContent])

  const handleDelete = async () => {
    if (!id || isDeleting) return

    setIsDeleting(true)
    try {
      await deleteRunningArt(id)
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
    setDraftContent(art.content ?? "")
    setIsEditingContent(true)
  }

  const handleCancelEditContent = () => {
    if (isSavingContent) return
    setDraftContent(art?.content ?? "")
    setIsEditingContent(false)
  }

  const handleSaveContent = async () => {
    if (!id || !art || isSavingContent) return

    setIsSavingContent(true)
    try {
      await patchRunningArt(id, { title: art.title, content: draftContent })
      setArt({ ...art, content: draftContent })
      setIsEditingContent(false)
      notify("설명이 저장되었습니다.", "success")
    } catch (error) {
      console.error("설명 저장 실패:", error)
      notify("설명 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "error")
    } finally {
      setIsSavingContent(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f29] text-white px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
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
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={handleDelete}
            disabled={!canManageArt || isLoading || isDeleting}
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>

        {isLoading && <p className="text-white/70">작품을 불러오는 중...</p>}

        {!isLoading && !art && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 space-y-4">
            <p className="text-white/80">작품을 찾을 수 없습니다.</p>
          </div>
        )}

        {art && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{art.title}</h2>
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
                    className="text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10"
                    onClick={handleStartEditContent}
                  >
                    설명 수정
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
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                      {isSavingContent ? "저장 중..." : "설명 저장"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-white/70 whitespace-pre-wrap">{art.content?.trim() || "설명이 없습니다."}</p>
              )}
            </div>

            <img src={art.imageUrl || "/placeholder.svg"} alt={art.title} className="w-full rounded-lg" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/80">공개 공유</span>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={art.isPublic}
                    onChange={(event) => updateShare(art.id, event.target.checked)}
                    disabled={!canManageArt || isLoading}
                    className="h-4 w-4"
                  />
                  {art.isPublic ? "공개" : "비공개"}
                </label>
              </div>
              {!canManageArt && <p className="text-white/60 text-sm">공유 설정은 소유자만 변경할 수 있습니다.</p>}
            </div>

            {art.isPublic ? (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <LinkIcon className="w-4 h-4" />
                <span className="truncate">{shareUrl}</span>
              </div>
            ) : (
              <p className="text-white/60 text-sm">이 작품은 비공개입니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
