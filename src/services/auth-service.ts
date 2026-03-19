import axios from "axios"
import type { AuthPayload, AuthTokens } from "@/types/auth"
import { env } from "@/services/env"
import { apiClient } from "@/services/api-client"
import { unwrapApiResponse, unwrapVoidResponse } from "@/types/api"

interface AccessTokenResponse {
  accessToken: string
  expireIn?: number
}

const authClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

export async function kakaoLogin(kakaoAccessToken: string): Promise<AuthPayload> {
  // Keep legacy login flow until OAuth callback contract is finalized with backend.
  const response = await authClient.post<AuthPayload>("/auth/kakao", { accessToken: kakaoAccessToken })
  return response.data
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  // Swagger contract: POST /api/v1/auth/reissue (RT via HttpOnly cookie).
  const response = await authClient.post("/api/v1/auth/reissue")
  const data = unwrapApiResponse<AccessTokenResponse>(response.data)
  return {
    accessToken: data.accessToken,
    // Keep local shape for compatibility with existing auth storage.
    refreshToken,
  }
}

export async function logoutFromServer(): Promise<void> {
  try {
    const response = await apiClient.post("/api/v1/auth/logout")
    unwrapVoidResponse(response.data)
  } catch (error) {
    // Local logout should still proceed even if server token is already invalid.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return
    }
    throw error
  }
}

export async function withdrawMe(): Promise<void> {
  const response = await apiClient.delete("/api/v1/auth/me")
  unwrapVoidResponse(response.data)
}
