import axios from "axios"
import type { AuthPayload, AuthTokens, User } from "@/types/auth"
import { env } from "@/services/env"
import { apiClient } from "@/services/api-client"
import { authStorage } from "@/services/auth-storage"
import { unwrapApiResponse, unwrapVoidResponse } from "@/types/api"

interface AccessTokenResponse {
  accessToken: string
  expireIn?: number
}

interface UserProfileResponse {
  email: string
  nickname?: string
  statusMessage?: string
}

const authClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

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

export async function exchangeOAuthCode(provider: "kakao" | "google", code: string): Promise<AccessTokenResponse> {
  const response = await authClient.get(`/api/v1/auth/callback/${provider}`, {
    params: { code },
  })
  return unwrapApiResponse<AccessTokenResponse>(response.data)
}

export async function completeOAuthLogin(provider: "kakao" | "google", code: string): Promise<AuthPayload> {
  const tokenData = await exchangeOAuthCode(provider, code)
  const user = await fetchMyProfile(tokenData.accessToken)
  const tokens: AuthTokens = {
    // OAuth callback JSON에서 access token을 분리해 기존 저장 구조에 맞춰 보관합니다.
    accessToken: tokenData.accessToken,
    // Refresh token은 HttpOnly 쿠키로 백엔드가 관리하므로 로컬에는 자리값만 유지합니다.
    refreshToken: "cookie",
  }

  authStorage.setTokens(tokens)
  authStorage.setUser(user)

  return {
    user,
    tokens,
  }
}

export async function fetchMyProfile(accessToken: string): Promise<User> {
  const response = await authClient.get("/api/v1/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const data = unwrapApiResponse<UserProfileResponse>(response.data)

  return {
    id: data.email || data.nickname || "me",
    name: data.nickname || data.email || "사용자",
    email: data.email,
    profileImage: undefined,
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
