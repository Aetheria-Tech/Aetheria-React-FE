interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_KAKAO_REST_API_KEY?: string
  readonly VITE_KAKAO_JS_KEY?: string
  readonly VITE_GOOGLE_LOGIN_URL?: string
  readonly VITE_DEV_BYPASS_AUTH?: string
  readonly VITE_USE_MOCK_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
