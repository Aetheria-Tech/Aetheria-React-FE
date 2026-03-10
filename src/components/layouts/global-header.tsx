import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export default function GlobalHeader() {
  const { isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-transparent text-white">
      <div className="flex h-16 w-full items-center justify-between border-b border-white/15 bg-black/25 px-4 shadow-lg backdrop-blur-md sm:px-8">
        <Link to="/" className="text-xl font-black hover:opacity-80 sm:text-4xl" aria-label="메인페이지 이동">
          Aetheria Logo
        </Link>

        <div className="flex items-center gap-2 text-xs font-black sm:gap-3 sm:text-base">
          {isLoggedIn ? (
            <>
              <Link to="/gallery" className="underline-offset-4 hover:underline">
                갤러리
              </Link>
              <Link to="/mypage" aria-label="마이페이지 이동">
                <Button variant="ghost" size="sm" className="font-black text-white hover:bg-white/10">
                  마이페이지
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                로그아웃
              </Button>
            </>
          ) : (
            <Link to="/login" aria-label="로그인 페이지 이동">
              <Button variant="outline" size="sm" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                로그인
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
