const LOCAL_API_BASE_URL = "http://localhost:8080"

const resolveEnv = () => (typeof process !== "undefined" ? process.env : {})

const normalizeUrl = (value: string) => value.replace(/\/+$/, "")

const isLocalBrowser = () => {
  if (typeof window === "undefined") {
    return false
  }

  const { hostname } = window.location
  return hostname === "localhost" || hostname === "127.0.0.1"
}

export const env = {
  get apiBaseUrl() {
    const configured = resolveEnv().VITE_API_BASE_URL?.trim() ?? ""
    if (configured) {
      return normalizeUrl(configured)
    }

    if (isLocalBrowser()) {
      return LOCAL_API_BASE_URL
    }

    return ""
  },
  get kakaoRestApiKey() {
    return resolveEnv().VITE_KAKAO_REST_API_KEY ?? ""
  },
  get kakaoJsKey() {
    return resolveEnv().VITE_KAKAO_JS_KEY ?? ""
  },
  get googleLoginUrl() {
    return resolveEnv().VITE_GOOGLE_LOGIN_URL ?? ""
  },
  get devBypassAuth() {
    return resolveEnv().VITE_DEV_BYPASS_AUTH ?? ""
  },
  get useMockApi() {
    return resolveEnv().VITE_USE_MOCK_API ?? ""
  },
}
