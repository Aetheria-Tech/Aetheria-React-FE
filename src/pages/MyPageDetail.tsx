import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useArtDetail } from "@/hooks/use-art-detail"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/context/toast-context"
import { formatDateTime, formatDistance } from "@/lib/formatters"
import { deleteRunningArt } from "@/services/art-service"

export default function MyPageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const { art, isLoading, loadArt, updateShare } = useArtDetail()
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadArt(id).catch(() => undefined)
    }
  }, [id, loadArt])

  const isOwner = useMemo(() => Boolean(art && user && art.ownerId === user.id), [art, user])
  const shareUrl = typeof window !== "undefined" && art ? `${window.location.origin}/share/${art.id}` : ""

  const handleDelete = async () => {
    if (!id || isDeleting) return

    setIsDeleting(true)
    try {
      await deleteRunningArt(id)
      notify("작품이 삭제되었습니다.", "success")
      navigate("/mypage", { replace: true })
    } catch {
      notify("작품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.", "error")
    } finally {
      setIsDeleting(false)
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
            disabled={!art || isLoading || isDeleting}
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

            <img src={art.imageUrl || "/placeholder.svg"} alt={art.title} className="w-full rounded-lg" />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/80">공개 공유</span>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={art.isPublic}
                    onChange={(event) => updateShare(art.id, event.target.checked)}
                    disabled={!isOwner || isLoading}
                    className="h-4 w-4"
                  />
                  {art.isPublic ? "공개" : "비공개"}
                </label>
              </div>
              {!isOwner && <p className="text-white/60 text-sm">공유 설정은 소유자만 변경할 수 있습니다.</p>}
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
