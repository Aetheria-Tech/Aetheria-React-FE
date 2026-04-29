import axios from "axios"
import { authStorage } from "@/services/auth-storage"
import { buildAuthTokens, shouldRefreshAccessToken } from "@/services/auth-token"
import { env } from "@/services/env"
import { unwrapApiResponse } from "@/types/api"
import type { AuthTokens } from "@/types/auth"

interface AccessTokenResponse {
  accessToken: string
  expireIn?: number
}

const authRefreshClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

let refreshPromise: Promise<AuthTokens | null> | null = null

export async function refreshTokens(accessToken: string): Promise<AuthTokens> {
  const response = await authRefreshClient.post("/api/v1/auth/reissue", undefined, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const data = unwrapApiResponse<AccessTokenResponse>(response.data)
  return buildAuthTokens(data.accessToken, "cookie", data.expireIn)
}

export const refreshStoredTokens = async (tokens: AuthTokens): Promise<AuthTokens | null> => {
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

export const refreshCurrentStoredTokens = async (): Promise<AuthTokens | null> => {
  const tokens = authStorage.getTokens()
  if (!tokens?.accessToken) {
    authStorage.clear()
    return null
  }

  return refreshStoredTokens(tokens)
}

export const getStoredAuthTokens = async (): Promise<AuthTokens | null> => {
  let tokens = authStorage.getTokens()
  if (!tokens?.accessToken) return null

  if (shouldRefreshAccessToken(tokens)) {
    tokens = await refreshStoredTokens(tokens)
  }

  return tokens
}

export const getAuthorizedAccessToken = async (): Promise<string | null> => {
  const tokens = await getStoredAuthTokens()
  return tokens?.accessToken ?? null
}

const buildAuthorizedHeaders = (headers: HeadersInit | undefined, accessToken: string) => {
  const authorizedHeaders = new Headers(headers)
  authorizedHeaders.set("Authorization", `Bearer ${accessToken}`)
  return authorizedHeaders
}

const createAuthenticationRequiredError = (reason: string) => new Error(`Authentication is required: ${reason}`)

export const fetchWithAuthRetry = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const tokens = await getStoredAuthTokens()
  if (!tokens?.accessToken) {
    throw createAuthenticationRequiredError("stored access token is missing or refresh failed.")
  }

  const requestWithToken = (accessToken: string) =>
    fetch(input, {
      ...init,
      credentials: init.credentials ?? "include",
      headers: buildAuthorizedHeaders(init.headers, accessToken),
    })

  let response = await requestWithToken(tokens.accessToken)
  if (response.status !== 401) return response

  const nextTokens = await refreshStoredTokens(tokens)
  if (!nextTokens?.accessToken) {
    throw createAuthenticationRequiredError("access token refresh failed after a 401 response.")
  }

  response = await requestWithToken(nextTokens.accessToken)
  return response
}
