import axios, { AxiosHeaders, type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios"
import { getStoredAuthTokens, refreshCurrentStoredTokens } from "@/services/auth-session"
import { env } from "@/services/env"

const FALLBACK_ORIGIN = "http://localhost"

const withTokenLookupContext = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return new Error(`API 요청 인증 토큰 확인에 실패했습니다: ${message}`)
}

const isAbsoluteUrl = (value: string) => /^[a-z][a-z\d+\-.]*:\/\//i.test(value)

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const getRuntimeOrigin = () => {
  if (typeof window === "undefined") return FALLBACK_ORIGIN
  return window.location.origin
}

const combineAxiosUrl = (baseUrl: string, url: string) => {
  if (!baseUrl || isAbsoluteUrl(url)) return url
  return `${trimTrailingSlash(baseUrl)}/${url.replace(/^\/+/, "")}`
}

const isRequestToConfiguredApi = (config: InternalAxiosRequestConfig) => {
  const runtimeOrigin = getRuntimeOrigin()
  const baseUrl = env.apiBaseUrl || runtimeOrigin
  const requestUrl = config.url ?? ""
  const requestBaseUrl = config.baseURL ?? env.apiBaseUrl
  const resolvedApiBaseUrl = new URL(baseUrl, runtimeOrigin)
  const resolvedRequestUrl = new URL(combineAxiosUrl(requestBaseUrl ?? "", requestUrl), runtimeOrigin)
  const apiPathPrefix = trimTrailingSlash(resolvedApiBaseUrl.pathname)
  const isSameApiOrigin = resolvedRequestUrl.origin === resolvedApiBaseUrl.origin
  const isInsideApiPath =
    !apiPathPrefix ||
    apiPathPrefix === "/" ||
    resolvedRequestUrl.pathname === apiPathPrefix ||
    resolvedRequestUrl.pathname.startsWith(`${apiPathPrefix}/`)

  return isSameApiOrigin && isInsideApiPath
}

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: env.apiBaseUrl,
    withCredentials: false,
    headers: {
      "Content-Type": "application/json",
    },
  })

  client.interceptors.request.use(async (config) => {
    if (!isRequestToConfiguredApi(config)) {
      return Promise.reject(new Error("apiClient는 백엔드 API 경로에만 사용할 수 있습니다."))
    }

    // 인증 쿠키는 백엔드 API 요청에만 붙여 외부 API로 credential이 나가지 않게 한다.
    config.withCredentials = true

    let tokens: Awaited<ReturnType<typeof getStoredAuthTokens>>

    try {
      tokens = await getStoredAuthTokens()
    } catch (error) {
      // 토큰 조회/갱신 오류가 나면 인증 없는 요청으로 보내지 않고 맥락을 붙여 호출자에게 전파한다.
      return Promise.reject(withTokenLookupContext(error))
    }

    if (tokens?.accessToken) {
      const headers = AxiosHeaders.from(config.headers)
      headers.set("Authorization", `Bearer ${tokens.accessToken}`)
      config.headers = headers
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined
      if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      const nextTokens = await refreshCurrentStoredTokens()
      if (!nextTokens?.accessToken) {
        return Promise.reject(error)
      }

      const headers = AxiosHeaders.from(originalRequest.headers)
      headers.set("Authorization", `Bearer ${nextTokens.accessToken}`)
      originalRequest.headers = headers

      return client(originalRequest)
    },
  )

  return client
}

export const apiClient = createApiClient()
