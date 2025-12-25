import axios, { type AxiosError, type AxiosInstance } from "axios"
import { authStorage } from "@/services/auth-storage"
import { refreshTokens } from "@/services/auth-service"
import { env } from "@/services/env"

const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: env.apiBaseUrl,
    headers: {
      "Content-Type": "application/json",
    },
  })

  client.interceptors.request.use((config) => {
    const tokens = authStorage.getTokens()
    if (tokens?.accessToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${tokens.accessToken}`,
      }
    }
    return config
  })

  let refreshPromise: Promise<string | null> | null = null

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined
      if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error)
      }

      const tokens = authStorage.getTokens()
      if (!tokens?.refreshToken) {
        authStorage.clear()
        return Promise.reject(error)
      }

      originalRequest._retry = true

      if (!refreshPromise) {
        // Single-flight refresh prevents reusing a stale refresh token in parallel requests.
        refreshPromise = refreshTokens(tokens.refreshToken)
          .then((nextTokens) => {
            authStorage.setTokens(nextTokens)
            return nextTokens.accessToken
          })
          .catch(() => {
            authStorage.clear()
            return null
          })
          .finally(() => {
            refreshPromise = null
          })
      }

      const newAccessToken = await refreshPromise
      if (!newAccessToken) {
        return Promise.reject(error)
      }

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      }

      return client(originalRequest)
    },
  )

  return client
}

export const apiClient = createApiClient()