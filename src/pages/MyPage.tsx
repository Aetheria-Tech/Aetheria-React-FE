import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Edit2, Grid3x3, List, Plus, Trash2, User, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import AppBackground from "@/components/layouts/app-background"
import { useMyArts } from "@/hooks/use-my-arts"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/context/toast-context"

export default function MyPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const { arts, isLoading, loadArts, removeArt } = useMyArts()
  const [viewMode, setViewMode] = useState<"thumbnail" | "list">("thumbnail")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    profileImage: "",
  })

  const formatDistance = (value: number) => (value ? `${value}km` : "-")
  const formatDate = (value: string) => {
    if (!value) return "-"
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString()
  }
  const formatDateTime = (value: string) => {
    if (!value) return "-"
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString()
  }

  useEffect(() => {
    setUserProfile({
      name: user?.name ?? "",
      email: user?.email ?? "",
      profileImage: user?.profileImage ?? "",
    })
  }, [user])

  useEffect(() => {
    loadArts().catch(() => undefined)
  }, [loadArts])

  const handleSaveProfile = () => {
    setIsEditingProfile(false)
    // Profile edits are local until backend support is added.
    notify("프로필 변경 사항이 로컬에 저장되었습니다.", "info")
  }

  return (
    <AppBackground overlayClassName="bg-black/50">
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/10 transition-all duration-300">
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

      <main className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">프로필</h2>
              {!isEditingProfile ? (
                <Button
                  onClick={() => setIsEditingProfile(true)}
                  variant="ghost"
                  size="sm"
                  className="text-indigo-300 hover:text-indigo-200 hover:bg-white/10 gap-2 transition-all duration-300"
                >
                  <Edit2 className="w-4 h-4" />
                  수정
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveProfile}
                    size="sm"
                    className="bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-300"
                  >
                    저장
                  </Button>
                  <Button
                    onClick={() => setIsEditingProfile(false)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/10 transition-all duration-300"
                  >
                    취소
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-start gap-6 mb-6">
              {userProfile.profileImage && (
                <img
                  src={userProfile.profileImage || "/placeholder.svg"}
                  alt="프로필"
                  className="w-20 h-20 rounded-full object-cover border-2 border-indigo-300"
                />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-indigo-300" />
                <div className="flex-1">
                  <p className="text-gray-300 text-sm">이름</p>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={userProfile.name}
                      onChange={(event) => setUserProfile({ ...userProfile, name: event.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
                    />
                  ) : (
                    <p className="text-white text-lg">{userProfile.name || "-"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-indigo-300" />
                <div className="flex-1">
                  <p className="text-gray-300 text-sm">이메일</p>
                  {isEditingProfile ? (
                    <input
                      type="email"
                      value={userProfile.email}
                      onChange={(event) => setUserProfile({ ...userProfile, email: event.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
                    />
                  ) : (
                    <p className="text-white text-lg">{userProfile.email || "-"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-4xl md:text-5xl font-semibold text-white drop-shadow-lg">내 작품</h1>
            <div className="flex items-center gap-4">
              <Link to="/create">
                <Button className="bg-indigo-500 hover:bg-indigo-600 text-white gap-2 transition-all duration-300">
                  <Plus className="w-4 h-4" />
                  생성하기
                </Button>
              </Link>
              <div className="flex gap-2 bg-white/10 backdrop-blur-md rounded-lg p-1 border border-white/20">
                <Button
                  variant={viewMode === "thumbnail" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("thumbnail")}
                  className={
                    viewMode === "thumbnail"
                      ? "bg-indigo-500 hover:bg-indigo-600 transition-all duration-300"
                      : "text-white hover:bg-white/10 transition-all duration-300"
                  }
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={
                    viewMode === "list"
                      ? "bg-indigo-500 hover:bg-indigo-600 transition-all duration-300"
                      : "text-white hover:bg-white/10 transition-all duration-300"
                  }
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {isLoading && <p className="text-white/70">작품을 불러오는 중...</p>}
          {!isLoading && arts.length === 0 && <p className="text-white/70">아직 작품이 없습니다.</p>}

          {viewMode === "thumbnail" && arts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {arts.map((artwork) => (
                <div
                  key={artwork.id}
                  className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group"
                >
                  <Link to={`/mypage/${artwork.id}`} className="block">
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={artwork.imageUrl || "/placeholder.svg"}
                        alt={artwork.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      />
                    </div>
                  </Link>
                  <div className="p-4 space-y-2">
                    <h3 className="text-white font-semibold text-lg truncate">{artwork.title}</h3>
                    <div className="flex items-center justify-between text-sm text-gray-300">
                      <span>{formatDistance(artwork.distanceKm)}</span>
                      <span>{formatDate(artwork.createdAt)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArt(artwork.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "list" && arts.length > 0 && (
            <div className="space-y-4">
              {arts.map((artwork) => (
                <div
                  key={artwork.id}
                  className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300"
                >
                  <div className="flex items-center gap-6">
                    <Link to={`/mypage/${artwork.id}`} className="flex-shrink-0">
                      <img
                        src={artwork.imageUrl || "/placeholder.svg"}
                        alt={artwork.title}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/mypage/${artwork.id}`}>
                        <h3 className="text-white font-semibold text-xl mb-2 hover:text-indigo-300 transition-all duration-300">
                          {artwork.title}
                        </h3>
                      </Link>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                        <span>거리: {formatDistance(artwork.distanceKm)}</span>
                        <span>생성일: {formatDateTime(artwork.createdAt)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArt(artwork.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppBackground>
  )
}
