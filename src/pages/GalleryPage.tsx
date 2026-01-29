import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Clock, Heart, Search, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ShootingStars from "@/components/shooting-stars"
import { fetchGalleryArts } from "@/services/art-service"
import type { Art } from "@/types/art"
import { useToast } from "@/context/toast-context"

export default function GalleryPage() {
  const { notify } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [arts, setArts] = useState<Art[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const formatDistance = (value: number) => (value ? `${value}km` : "-")
  const formatDate = (value: string) => {
    if (!value) return "-"
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString()
  }

  useEffect(() => {
    setIsLoading(true)
    fetchGalleryArts()
      .then((data) => setArts(data))
      .catch(() => notify("갤러리를 불러오지 못했습니다.", "error"))
      .finally(() => setIsLoading(false))
  }, [notify])

  const filteredItems = useMemo(
    () =>
      arts.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase().trim())),
    [arts, searchQuery],
  )

  return (
    <div className="min-h-screen bg-[#0a0f29] relative">
      <ShootingStars />

      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-white/10">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/20">
            <ArrowLeft className="w-4 h-4" />
            뒤로
          </Button>
        </Link>
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%202025%EB%85%84%2011%EC%9B%94%2012%EC%9D%BC%20%EC%98%A4%ED%9B%84%2006_49_46-KkdNi8eRKRtmyvGjfBZ8KIzSsAc6s4.png"
            alt="Aetheria 로고"
            className="h-8 object-contain"
          />
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-8">
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
                className="pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/50 h-12"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <Button className="bg-[#836FFF] hover:bg-[#6b5acc] gap-2">
              <TrendingUp className="w-4 h-4" />
              인기
            </Button>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/20 gap-2 bg-transparent">
              <Clock className="w-4 h-4" />
              최신
            </Button>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/20 gap-2 bg-transparent">
              <Heart className="w-4 h-4" />
              좋아요 순
            </Button>
          </div>

          {isLoading && <p className="text-white/70">갤러리를 불러오는 중...</p>}
          {!isLoading && filteredItems.length === 0 && <p className="text-white/70">작품이 없습니다.</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Link key={item.id} to={`/share/${item.id}`}>
                <div className="group bg-white/10 rounded-xl overflow-hidden border border-white/20 hover:border-[#836FFF]/50 transition-all hover:scale-105">
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
                      <span className="text-[#836FFF] font-medium">{formatDate(item.createdAt)}</span>
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
