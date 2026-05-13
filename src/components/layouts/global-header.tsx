import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useCallback } from "react"
import { logoutMe } from "@/services/auth-service"

interface GlobalHeaderProps {
  hideGuestLoginButton?: boolean
}

export default function GlobalHeader({ hideGuestLoginButton = false }: GlobalHeaderProps) {
  const { isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    void logoutMe().finally(() => {
      logout()
      navigate("/", { replace: true })
    })
  }, [logout, navigate])

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-transparent text-white">
      <div className="flex h-16 w-full items-center justify-between border-b border-white/10 bg-surface-container-low/90 px-4 shadow-lg backdrop-blur-md sm:px-8">
        <Link to="/" className="text-xl font-black hover:opacity-80 sm:text-4xl" aria-label="메인페이지 이동">
          Aetheria
        </Link>

        <div className="flex items-center gap-2 text-xs font-black sm:gap-3 sm:text-base">
          {isLoggedIn ? (
            <>
              <Link to="/mypage" aria-label="마이페이지 이동">
                <Button variant="ghost" size="sm" className="font-black text-white hover:bg-white/10">
                  마이페이지
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-white/15 bg-surface-container-high text-white hover:bg-white/10"
              >
                로그아웃
              </Button>
            </>
          ) : !hideGuestLoginButton ? (
            <Link to="/login" aria-label="로그인 페이지 이동">
              <Button variant="outline" size="sm" className="border-white/15 bg-surface-container-high text-white hover:bg-white/10">
                로그인
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}
