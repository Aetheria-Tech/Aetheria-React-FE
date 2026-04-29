import axios from "axios"
import { apiClient } from "@/services/api-client"
import { authStorage } from "@/services/auth-storage"
import { buildAuthTokens } from "@/services/auth-token"
import { env } from "@/services/env"
import type { AuthPayload, User } from "@/types/auth"
import { unwrapApiResponse, unwrapVoidResponse } from "@/types/api"

export { refreshTokens } from "@/services/auth-session"

interface AccessTokenResponse {
  accessToken: string
  expireIn?: number
}

interface UserProfileResponse {
  email?: string
  nickname?: string
  statusMessage?: string
}

interface UpdateMyProfileRequest {
  nickname: string
  statusMessage: string
}

const authClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

const mapUserProfile = (data: UserProfileResponse): User => {
  const email = data.email?.trim()

  if (!email) {
    throw new Error("User profile missing stable identifier")
  }

  return {
    id: email,
    name: data.nickname || email,
    email,
    statusMessage: data.statusMessage?.trim() || "",
    profileImage: undefined,
  }
}

export async function exchangeOAuthCode(provider: "kakao" | "google", code: string): Promise<AccessTokenResponse> {
  const response = await authClient.get(`/api/v1/auth/callback/${provider}`, {
    params: { code },
  })
  return unwrapApiResponse<AccessTokenResponse>(response.data)
}

async function storeAuthPayload(accessToken: string, refreshToken = "cookie", expireIn?: number): Promise<AuthPayload> {
  try {
    const user = await fetchMyProfile(accessToken)
    const tokens = buildAuthTokens(accessToken, refreshToken, expireIn)

    authStorage.setTokens(tokens)
    authStorage.setUser(user)

    return {
      user,
      tokens,
    }
  } catch (error) {
    // 프로필 확인 또는 저장 실패 시 이전 인증 상태가 남지 않도록 정리한다.
    authStorage.clear()
    throw error
  }
}

export async function completeOAuthLogin(provider: "kakao" | "google", code: string): Promise<AuthPayload> {
  const tokenData = await exchangeOAuthCode(provider, code)
  return storeAuthPayload(tokenData.accessToken, "cookie", tokenData.expireIn)
}

export async function completeOAuthLoginWithAccessToken(accessToken: string): Promise<AuthPayload> {
  return storeAuthPayload(accessToken)
}

export async function fetchMyProfile(accessToken: string): Promise<User> {
  const response = await authClient.get("/api/v1/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const data = unwrapApiResponse<UserProfileResponse>(response.data)
  return mapUserProfile(data)
}

export async function updateMyProfile(request: UpdateMyProfileRequest): Promise<User> {
  const response = await apiClient.patch("/api/v1/users/me", request)
  const data = unwrapApiResponse<UserProfileResponse>(response.data)
  const user = mapUserProfile(data)
  authStorage.setUser(user)
  return user
}

export async function withdrawMe(): Promise<void> {
  const response = await apiClient.delete("/api/v1/auth/me")
  unwrapVoidResponse(response.data)
}
