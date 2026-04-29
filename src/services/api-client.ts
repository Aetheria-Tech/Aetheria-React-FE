import axios, { AxiosHeaders, type AxiosError, type AxiosInstance } from "axios"
import { getStoredAuthTokens, refreshCurrentStoredTokens } from "@/services/auth-session"
import { env } from "@/services/env"

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: env.apiBaseUrl,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  })

  client.interceptors.request.use(async (config) => {
    let tokens: Awaited<ReturnType<typeof getStoredAuthTokens>>

    try {
      tokens = await getStoredAuthTokens()
    } catch (error) {
      // 토큰 조회/갱신 오류가 나면 인증 없는 요청으로 보내지 않고 호출자에게 전파한다.
      return Promise.reject(error)
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
