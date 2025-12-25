const resolveEnv = () => (typeof process !== "undefined" ? process.env : {})

export const env = {
  get apiBaseUrl() {
    return resolveEnv().VITE_API_BASE_URL ?? ""
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
}
