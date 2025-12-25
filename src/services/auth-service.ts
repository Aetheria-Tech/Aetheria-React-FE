import axios from "axios"
import type { AuthPayload, AuthTokens } from "@/types/auth"
import { env } from "@/services/env"

const authClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
})

export async function kakaoLogin(kakaoAccessToken: string): Promise<AuthPayload> {
  // Use a dedicated client to avoid auth interceptor loops during login.
  const response = await authClient.post<AuthPayload>("/auth/kakao", { accessToken: kakaoAccessToken })
  return response.data
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  // Refresh uses a bare client so expired access tokens do not block the call.
  const response = await authClient.post<AuthTokens>("/auth/refresh", { refreshToken })
  return response.data
}