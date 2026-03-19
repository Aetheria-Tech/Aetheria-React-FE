import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import AppBackground from "@/components/layouts/app-background"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/context/toast-context"
import { completeOAuthLogin, completeOAuthLoginWithAccessToken } from "@/services/auth-service"

type SocialProvider = "kakao" | "google"

const isSocialProvider = (value: string | undefined): value is SocialProvider =>
  value === "kakao" || value === "google"

const getAccessTokenFromHash = () => {
  const hash = window.location.hash.replace(/^#/, "")
  if (!hash) {
    return null
  }

  const params = new URLSearchParams(hash)
  return params.get("accessToken")
}

export default function OAuthCallbackPage() {
  const { login } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const { provider } = useParams()
  const [searchParams] = useSearchParams()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const code = searchParams.get("code")
  const accessToken = getAccessTokenFromHash()

  useEffect(() => {
    if (!isSocialProvider(provider) || (!code && !accessToken)) {
      notify("로그인 정보가 올바르지 않습니다. 다시 시도해주세요.", "error")
      navigate("/login", { replace: true })
      return
    }

    let cancelled = false

    const completeLogin = async () => {
      try {
        const payload = accessToken
          ? await completeOAuthLoginWithAccessToken(accessToken)
          : await completeOAuthLogin(provider, code as string)

        if (cancelled) {
          return
        }

        login(payload)

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: "AETHERIA_OAUTH_SUCCESS",
              payload,
            },
            window.location.origin,
          )
          window.close()
          return
        }

        notify("로그인에 성공했습니다.", "success")
        navigate("/", { replace: true })
      } catch (error) {
        console.error("OAuth 로그인 처리 실패:", error)
        if (cancelled) {
          return
        }

        setErrorMessage("로그인 처리에 실패했습니다. 다시 시도해주세요.")
      }
    }

    void completeLogin()

    return () => {
      cancelled = true
    }
  }, [accessToken, code, login, navigate, notify, provider])

  return (
    <AppBackground overlayClassName="bg-black/70">
      {errorMessage ? (
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0d1224]/90 p-8 text-white shadow-2xl backdrop-blur-md">
            <h1 className="mb-3 text-2xl font-bold">로그인 처리 실패</h1>
            <p className="mb-6 text-sm leading-relaxed text-white/75">{errorMessage}</p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => window.location.reload()}>
                다시 시도
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
                onClick={() => navigate("/login", { replace: true })}
              >
                로그인으로 이동
              </Button>
            </div>
          </div>
        </main>
      ) : (
        <LoadingSpinner />
      )}
    </AppBackground>
  )
}
