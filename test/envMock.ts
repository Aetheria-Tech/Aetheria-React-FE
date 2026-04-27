const readEnv = (key: string) => process.env[key] ?? ""

export const env = {
  get apiBaseUrl() {
    return readEnv("VITE_API_BASE_URL")
  },
  get kakaoRestApiKey() {
    return readEnv("VITE_KAKAO_REST_API_KEY")
  },
  get kakaoJsKey() {
    return readEnv("VITE_KAKAO_JS_KEY")
  },
  get googleLoginUrl() {
    return readEnv("VITE_GOOGLE_LOGIN_URL")
  },
  get devBypassAuth() {
    return readEnv("VITE_DEV_BYPASS_AUTH")
  },
  get useMockApi() {
    return readEnv("VITE_USE_MOCK_API")
  },
  get generationSseConnectTimeoutMs() {
    return readEnv("VITE_GENERATION_SSE_CONNECT_TIMEOUT_MS")
  },
}
