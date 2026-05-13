import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Clock, Heart, Search, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ShootingStars from "@/components/shooting-stars"
import GlobalHeader from "@/components/layouts/global-header"
import { fetchGalleryArts } from "@/services/art-service"
import type { Art } from "@/types/art"
import { useToast } from "@/context/toast-context"
import { formatDate, formatDistance } from "@/lib/formatters"

export default function GalleryPage() {
  const { notify } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [arts, setArts] = useState<Art[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    fetchGalleryArts()
      .then((data) => setArts(data))
      .catch(() => notify("갤러리를 불러오지 못했습니다.", "error"))
      .finally(() => setIsLoading(false))
  }, [notify])

  const filteredItems = useMemo(
    () => arts.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase().trim())),
    [arts, searchQuery],
  )

  return (
    <div className="relative min-h-screen bg-background">
      <ShootingStars />
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-6 pb-12 pt-24">
        <div className="space-y-8">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4" />
              뒤로
            </Button>
          </Link>

          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold text-white">러닝 아트 갤러리</h1>
              <p className="text-white/70 text-lg">다른 러너들의 작품을 둘러보세요.</p>
            </div>

            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <Input
                placeholder="작품 검색..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-12 border-white/15 bg-surface-container-high pl-12 text-white placeholder:text-white/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary-container">
              <TrendingUp className="w-4 h-4" />
              인기
            </Button>
            <Button variant="outline" className="gap-2 border-white/15 bg-surface-container-high text-white hover:bg-white/10">
              <Clock className="w-4 h-4" />
              최신
            </Button>
            <Button variant="outline" className="gap-2 border-white/15 bg-surface-container-high text-white hover:bg-white/10">
              <Heart className="w-4 h-4" />
              좋아요 순
            </Button>
          </div>

          {isLoading && <p className="text-white/70">갤러리를 불러오는 중...</p>}
          {!isLoading && filteredItems.length === 0 && <p className="text-white/70">작품이 없습니다.</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Link key={item.id} to={`/share/${item.id}`}>
                <div className="group overflow-hidden rounded-xl border border-white/15 bg-surface-container transition-all hover:scale-105 hover:border-white/40">
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">{formatDistance(item.distanceKm)}</span>
                      <span className="font-medium text-white">{formatDate(item.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">테마: {item.theme}</span>
                      <div className="flex items-center gap-1 text-white/60">
                        <Heart className="w-4 h-4" />
                        <span>0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
