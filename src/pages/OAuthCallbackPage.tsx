import { useEffect } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import AppBackground from "@/components/layouts/app-background"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/context/toast-context"
import { completeOAuthLogin } from "@/services/auth-service"

type SocialProvider = "kakao" | "google"

const isSocialProvider = (value: string | undefined): value is SocialProvider =>
  value === "kakao" || value === "google"

export default function OAuthCallbackPage() {
  const { login } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const { provider } = useParams()
  const [searchParams] = useSearchParams()
  const code = searchParams.get("code")

  useEffect(() => {
    if (!isSocialProvider(provider) || !code) {
      notify("로그인 정보가 올바르지 않습니다. 다시 시도해주세요.", "error")
      navigate("/login", { replace: true })
      return
    }

    let cancelled = false

    const completeLogin = async () => {
      try {
        const payload = await completeOAuthLogin(provider, code)
        if (cancelled) return

        // 콜백 JSON을 처리한 뒤 현재 앱 상태와 로컬스토리지를 함께 동기화합니다.
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
        if (cancelled) return

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: "AETHERIA_OAUTH_ERROR",
              message: "로그인 처리에 실패했습니다. 다시 시도해주세요.",
            },
            window.location.origin,
          )
          window.close()
          return
        }

        notify("로그인 처리에 실패했습니다. 다시 시도해주세요.", "error")
        navigate("/login", { replace: true })
      }
    }

    void completeLogin()

    return () => {
      cancelled = true
    }
  }, [code, login, navigate, notify, provider])

  return (
    <AppBackground overlayClassName="bg-black/70">
      <LoadingSpinner />
    </AppBackground>
  )
}
