export interface User {
  id: string
  name: string
  email: string
  profileImage?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthPayload {
  user: User
  tokens: AuthTokens
}