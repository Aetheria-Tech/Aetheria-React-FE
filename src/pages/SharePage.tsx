import { useEffect } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import GlobalHeader from "@/components/layouts/global-header"
import { useArtDetail } from "@/hooks/use-art-detail"
import { useAuth } from "@/context/auth-context"
import { formatDateTime, formatDistance } from "@/lib/formatters"

export default function SharePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { art, isLoading, loadArt } = useArtDetail()
  const { user } = useAuth()

  useEffect(() => {
    if (id) {
      loadArt(id).catch(() => undefined)
    }
  }, [id, loadArt])

  useEffect(() => {
    if (!art) return
    const isOwner = user?.id && art.ownerId === user.id
    if (!art.isPublic && !isOwner) {
      navigate("/403", { replace: true })
    }
  }, [art, navigate, user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f29] text-white">
        <GlobalHeader />
        <div className="px-6 pb-10 pt-24">
          <p className="text-white/70">작품을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!art) {
    return (
      <div className="min-h-screen bg-[#0a0f29] text-white">
        <GlobalHeader />
        <div className="px-6 pb-10 pt-24">
          <p className="text-white/70">작품을 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f29] text-white">
      <GlobalHeader />
      <div className="mx-auto max-w-3xl space-y-6 px-6 pb-10 pt-24">
        <div className="flex items-center gap-3">
          <Link to="/gallery">
            <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4" />
              갤러리로
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold">공유된 작품</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 space-y-4">
          <h2 className="text-2xl font-semibold">{art.title}</h2>
          <img src={art.imageUrl || "/placeholder.svg"} alt={art.title} className="w-full rounded-lg" />
          <p className="text-white/70">거리: {formatDistance(art.distanceKm)}</p>
          <p className="text-white/60">생성일: {formatDateTime(art.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}
