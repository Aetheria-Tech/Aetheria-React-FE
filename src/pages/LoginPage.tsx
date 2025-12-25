import { useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import AppBackground from "@/components/layouts/app-background"
import { env } from "@/services/env"
import { kakaoLogin } from "@/services/auth-service"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/context/toast-context"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const { notify } = useToast()

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://developers.kakao.com/sdk/js/kakao.js"
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        if (!env.kakaoJsKey) {
          notify("Kakao JS 키가 없습니다.", "error")
          return
        }
        window.Kakao.init(env.kakaoJsKey)
      }
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [notify])

  const handleKakaoLogin = () => {
    if (!window.Kakao) {
      notify("Kakao SDK가 준비되지 않았습니다.", "error")
      return
    }

    window.Kakao.Auth.login({
      success: async (authObj: { access_token?: string; accessToken?: string }) => {
        try {
          const kakaoAccessToken = authObj.access_token ?? authObj.accessToken
          if (!kakaoAccessToken) {
            notify("Kakao 액세스 토큰이 없습니다.", "error")
            return
          }

          const payload = await kakaoLogin(kakaoAccessToken)
          login(payload)

          const redirectTo = (location.state as { from?: string } | null)?.from ?? "/mypage"
          navigate(redirectTo)
        } catch {
          notify("로그인에 실패했습니다. 다시 시도해 주세요.", "error")
        }
      },
      fail: () => {
        notify("로그인에 실패했습니다. 다시 시도해 주세요.", "error")
      },
    })
  }

  return (
    <AppBackground overlayClassName="bg-black/60">
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
            뒤로
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logoimage-If0HzkvmbETUJ7bKqfpBGjkd2faQfr.png"
            alt="러닝 아트 로고"
            className="w-10 h-10 object-contain"
          />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">로그인</h1>
              <p className="text-white/70">러닝 아트를 생성하고 공유하려면 로그인하세요.</p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleKakaoLogin}
                className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] py-6 text-lg font-semibold flex items-center justify-center gap-3"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 3C6.477 3 2 6.477 2 10.8C2 13.386 3.563 15.679 6 17.1V21L9.75 18.75C10.47 18.9 11.22 19 12 19C17.523 19 22 15.523 22 11.2C22 6.877 17.523 3 12 3Z"
                    fill="currentColor"
                  />
                </svg>
                카카오로 로그인
              </Button>

              <p className="text-white/50 text-xs text-center leading-relaxed">
                로그인하면 이용약관과 개인정보처리방침에 동의한 것으로 간주됩니다.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">카카오 계정으로 빠르게 로그인하세요.</p>
          </div>
        </div>
      </main>
    </AppBackground>
  )
}
