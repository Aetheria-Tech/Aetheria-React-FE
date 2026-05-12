export interface User {
  id: string
  name: string
  email: string
  provider?: "kakao" | "google"
  statusMessage?: string
  profileImage?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt?: number
}

export interface AuthPayload {
  user: User
  tokens: AuthTokens
}
