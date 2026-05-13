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

const oauthCompletionRequests = new Map<string, Promise<Awaited<ReturnType<typeof completeOAuthLogin>>>>()
const SUCCESSFUL_OAUTH_REQUEST_CLEANUP_DELAY_MS = 100

const scheduleOAuthCompletionRequestCleanup = (
  attemptKey: string,
  completionRequest: Promise<Awaited<ReturnType<typeof completeOAuthLogin>>>,
) => {
  setTimeout(() => {
    if (oauthCompletionRequests.get(attemptKey) === completionRequest) {
      oauthCompletionRequests.delete(attemptKey)
    }
  }, SUCCESSFUL_OAUTH_REQUEST_CLEANUP_DELAY_MS)
}

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

    const attemptKey = `${provider}:${code ?? ""}:${accessToken ?? ""}`

    // StrictMode 재마운트에서도 같은 OAuth callback 요청은 한 번만 보내도록 key로 공유한다.
    let cancelled = false

    const completeLogin = async () => {
      let completionRequest: Promise<Awaited<ReturnType<typeof completeOAuthLogin>>> | null = null
      let shouldCleanupAfterStrictModeReplay = false

      try {
        // React StrictMode는 개발 환경에서 callback 화면을 mount/unmount/remount 할 수 있으므로
        // 동일한 인가 코드를 사용하는 요청은 한 번만 보내고, remount 된 화면은 같은 Promise를 공유합니다.
        const existingRequest = oauthCompletionRequests.get(attemptKey)
        completionRequest =
          existingRequest ??
          (accessToken
            ? completeOAuthLoginWithAccessToken(accessToken, provider)
            : completeOAuthLogin(provider, code as string))

        if (!existingRequest) {
          oauthCompletionRequests.set(attemptKey, completionRequest)
        }

        const payload = await completionRequest
        shouldCleanupAfterStrictModeReplay = true

        if (cancelled) {
          return
        }

        // 로그인 payload 저장은 AuthContext에 맡겨 이후 API client가 같은 인증 상태를 사용하게 한다.
        login(payload)
        notify("로그인에 성공했습니다.", "success")
        navigate("/", { replace: true })
      } catch (error) {
        console.error("OAuth 로그인 처리 실패:", error)
        if (cancelled) {
          return
        }

        setErrorMessage("로그인 처리에 실패했습니다. 다시 시도해주세요.")
      } finally {
        if (!completionRequest) return

        if (shouldCleanupAfterStrictModeReplay) {
          // 성공 요청은 StrictMode 재실행과 인증 상태 rerender가 같은 Promise를 재사용한 뒤 정리되도록 잠시 늦춘다.
          scheduleOAuthCompletionRequestCleanup(attemptKey, completionRequest)
        } else if (oauthCompletionRequests.get(attemptKey) === completionRequest) {
          // 실패 요청은 사용자가 같은 callback으로 재시도할 수 있도록 즉시 정리한다.
          oauthCompletionRequests.delete(attemptKey)
        }
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
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-surface-container/90 p-8 text-white shadow-2xl backdrop-blur-md">
            <h1 className="mb-3 text-2xl font-bold">로그인 처리 실패</h1>
            <p className="mb-6 text-sm leading-relaxed text-white/75">{errorMessage}</p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => navigate("/login", { replace: true })}>
                다시 시도
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-white/15 bg-surface-container-high text-white hover:bg-white/10"
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
