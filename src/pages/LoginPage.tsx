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

  const getGoogleLoginUrl = () => {
    if (env.googleLoginUrl) return env.googleLoginUrl
    if (!env.apiBaseUrl) return ""
    return `${env.apiBaseUrl.replace(/\/$/, "")}/auth/google`
  }

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

  const handleGoogleLogin = () => {
    const loginUrl = getGoogleLoginUrl()
    if (!loginUrl) {
      notify("Google 로그인 URL이 없습니다.", "error")
      return
    }

    window.location.assign(loginUrl)
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

              <Button
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full bg-white/10 hover:bg-white/20 text-white py-6 text-lg font-semibold flex items-center justify-center gap-3 border border-white/30"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.47a5.54 5.54 0 0 1-2.4 3.64v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.75Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.05 1.15-3.12 0-5.77-2.1-6.72-4.93H1.27v3.1A12 12 0 0 0 12 24Z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.28 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.27a12 12 0 0 0 0 10.8l4.01-3.1Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.77c1.76 0 3.34.6 4.58 1.8l3.43-3.43C17.95 1.15 15.24 0 12 0A12 12 0 0 0 1.27 6.6l4.01 3.1C6.23 6.87 8.88 4.77 12 4.77Z"
                    fill="#EA4335"
                  />
                </svg>
                Google로 로그인
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
