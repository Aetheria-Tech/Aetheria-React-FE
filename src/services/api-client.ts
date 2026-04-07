import axios, { AxiosHeaders, type AxiosError, type AxiosInstance } from "axios"
import { authStorage } from "@/services/auth-storage"
import { shouldRefreshAccessToken } from "@/services/auth-token"
import { refreshTokens } from "@/services/auth-service"
import { env } from "@/services/env"
import type { AuthTokens } from "@/types/auth"

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: env.apiBaseUrl,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
    },
  })

  let refreshPromise: Promise<AuthTokens | null> | null = null

  const refreshStoredTokens = async (tokens: AuthTokens): Promise<AuthTokens | null> => {
    if (!refreshPromise) {
      refreshPromise = refreshTokens(tokens.accessToken)
        .then((nextTokens) => {
          authStorage.setTokens(nextTokens)
          return nextTokens
        })
        .catch(() => {
          authStorage.clear()
          return null
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    return refreshPromise
  }

  client.interceptors.request.use(async (config) => {
    let tokens = authStorage.getTokens()

    if (tokens?.accessToken && shouldRefreshAccessToken(tokens)) {
      tokens = await refreshStoredTokens(tokens)
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

      const tokens = authStorage.getTokens()
      if (!tokens?.accessToken) {
        authStorage.clear()
        return Promise.reject(error)
      }

      originalRequest._retry = true

      const nextTokens = await refreshStoredTokens(tokens)
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
