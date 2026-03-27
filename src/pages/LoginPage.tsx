import { useCallback, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import AppBackground from "@/components/layouts/app-background"
import GlobalHeader from "@/components/layouts/global-header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/context/toast-context"
import { redirectTo } from "@/lib/navigation"
import { env } from "@/services/env"
import type { AuthPayload } from "@/types/auth"

type SocialProvider = "kakao" | "google"

export default function LoginPage() {
  const { notify } = useToast()
  const { login } = useAuth()
  const navigate = useNavigate()
  const popupRef = useRef<Window | null>(null)

  const getSocialLoginUrl = useCallback((provider: SocialProvider) => {
    if (provider === "google" && env.googleLoginUrl) {
      return env.googleLoginUrl
    }

    const defaultPath = `/api/v1/auth/login/${provider}`
    const baseUrl = env.apiBaseUrl
    if (!baseUrl) {
      return defaultPath
    }

    try {
      return new URL(defaultPath, baseUrl).href
    } catch (error) {
      console.error(`${provider} 로그인 URL 생성에 실패했습니다:`, baseUrl, error)
      return defaultPath
    }
  }, [])

  const handleSocialLogin = (provider: SocialProvider) => {
    const loginUrl = getSocialLoginUrl(provider)
    if (!loginUrl) {
      notify("로그인 URL이 없습니다.", "error")
      return
    }

    const popup = window.open(
      loginUrl,
      "aetheria-social-login",
      "width=520,height=720,left=200,top=120,resizable=yes,scrollbars=yes",
    )

    if (!popup) {
      redirectTo(loginUrl)
      return
    }

    popupRef.current = popup
  }

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      const data = event.data as
        | { type?: string; payload?: AuthPayload; message?: string }
        | undefined

      if (data?.type === "AETHERIA_OAUTH_SUCCESS" && data.payload) {
        login(data.payload)
        popupRef.current?.close()
        navigate("/", { replace: true })
        return
      }

      if (data?.type === "AETHERIA_OAUTH_ERROR") {
        notify(data.message ?? "로그인 처리에 실패했습니다. 다시 시도해주세요.", "error")
        popupRef.current?.close()
      }
    }

    window.addEventListener("message", handleOAuthMessage)
    return () => {
      window.removeEventListener("message", handleOAuthMessage)
    }
  }, [login, navigate, notify])

  return (
    <AppBackground overlayClassName="bg-black/60">
      <GlobalHeader hideGuestLoginButton />

      <main className="flex flex-1 items-center justify-center px-6 pb-12 pt-24">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-md">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold text-white">로그인</h1>
              <p className="text-white/70">러닝 아트를 생성하고 공유하려면 로그인해주세요.</p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => handleSocialLogin("kakao")}
                className="flex w-full items-center justify-center gap-3 bg-[#FEE500] py-6 text-lg font-semibold text-[#000000] hover:bg-[#FDD835]"
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
                onClick={() => handleSocialLogin("google")}
                variant="outline"
                className="flex w-full items-center justify-center gap-3 border border-white/30 bg-white/10 py-6 text-lg font-semibold text-white hover:bg-white/20"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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

              <p className="text-center text-xs leading-relaxed text-white/50">
                로그인하면 이용약관과 개인정보처리방침에 동의한 것으로 간주됩니다.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">소셜 계정으로 빠르게 로그인해주세요.</p>
          </div>
        </div>
      </main>
    </AppBackground>
  )
}
