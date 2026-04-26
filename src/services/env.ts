type RuntimeEnv = Partial<Record<keyof ImportMetaEnv, string>>

type GlobalWithProcessEnv = typeof globalThis & {
  process?: {
    env?: RuntimeEnv
  }
}

const resolveEnv = (): RuntimeEnv => {
  const processEnv = (globalThis as GlobalWithProcessEnv).process?.env ?? {}

  return {
    ...import.meta.env,
    ...processEnv,
  }
}

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
  get devBypassAuth() {
    return resolveEnv().VITE_DEV_BYPASS_AUTH ?? ""
  },
  get useMockApi() {
    return resolveEnv().VITE_USE_MOCK_API ?? ""
  },
}
