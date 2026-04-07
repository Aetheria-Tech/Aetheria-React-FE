import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Edit2, Grid3x3, List, Mail, MessageSquareText, Plus, User } from "lucide-react"
import AppBackground from "@/components/layouts/app-background"
import GlobalHeader from "@/components/layouts/global-header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useMyArts } from "@/hooks/use-my-arts"
import { formatDate, formatDateTime, formatDistance } from "@/lib/formatters"
import { updateMyProfile, withdrawMe } from "@/services/auth-service"
import { useToast } from "@/context/toast-context"

export default function MyPage() {
  const { user, logout, updateUser } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const { arts, isLoading, loadArts } = useMyArts()
  const [viewMode, setViewMode] = useState<"thumbnail" | "list">("thumbnail")
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
    loadArts().catch(() => undefined)
  }, [loadArts])

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

  const handleCancelProfileEdit = () => {
    if (isSavingProfile) return
    setUserProfile({
      name: user?.name ?? "",
      email: user?.email ?? "",
      statusMessage: user?.statusMessage ?? "",
      profileImage: user?.profileImage ?? "",
    })
    setIsEditingProfile(false)
  }

  const handleSaveProfile = async () => {
    if (isSavingProfile) return

    const nickname = userProfile.name.trim()
    const statusMessage = userProfile.statusMessage.trim()

    if (nickname.length < 2 || nickname.length > 20) {
      notify("닉네임은 2자 이상 20자 이하로 입력해주세요.", "error")
      return
    }

    if (statusMessage.length > 100) {
      notify("상태 메시지는 100자 이하로 입력해주세요.", "error")
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
      notify("프로필 저장에 실패했습니다. 입력값을 확인한 뒤 다시 시도해주세요.", "error")
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

  return (
    <AppBackground overlayClassName="bg-black/50">
      <GlobalHeader />

      <main className="flex-1 px-6 pb-8 pt-24">
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
                    disabled={isSavingProfile}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-300"
                  >
                    {isSavingProfile ? "저장 중..." : "저장"}
                  </Button>
                  <Button
                    onClick={handleCancelProfileEdit}
                    variant="ghost"
                    size="sm"
                    disabled={isSavingProfile}
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
                      aria-label="닉네임 입력"
                      value={userProfile.name}
                      onChange={(event) => setUserProfile({ ...userProfile, name: event.target.value })}
                      maxLength={20}
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
                  <p className="text-white text-lg">{userProfile.email || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 md:col-span-2">
                <MessageSquareText className="w-5 h-5 text-indigo-300 mt-1" />
                <div className="flex-1">
                  <p className="text-gray-300 text-sm">상태 메시지</p>
                  {isEditingProfile ? (
                    <textarea
                      aria-label="상태 메시지 입력"
                      value={userProfile.statusMessage}
                      onChange={(event) => setUserProfile({ ...userProfile, statusMessage: event.target.value })}
                      rows={3}
                      maxLength={100}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300"
                    />
                  ) : (
                    <p className="text-white text-lg whitespace-pre-wrap">{userProfile.statusMessage?.trim() || "-"}</p>
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
                  className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-all duration-300"
                >
                  회원탈퇴
                </Button>
              </div>
            )}
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
                  </div>
                </div>
              ))}
            </div>
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
            <h2 id="withdraw-title" className="text-xl font-semibold mb-3">
              회원탈퇴
            </h2>
            <p className="text-white/70 text-sm mb-6">
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
                className="bg-rose-500 hover:bg-rose-600 text-white"
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
