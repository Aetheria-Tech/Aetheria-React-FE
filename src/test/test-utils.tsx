import { render, type RenderOptions } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { ReactElement } from "react"
import { AuthProvider } from "@/context/auth-context"
import { ToastProvider } from "@/context/toast-context"
import { authStorage } from "@/services/auth-storage"
import type { AuthPayload } from "@/types/auth"

interface ExtendedRenderOptions extends RenderOptions {
  route?: string
  auth?: AuthPayload | null
}

export function renderWithProviders(ui: ReactElement, options: ExtendedRenderOptions = {}) {
  const { route = "/", auth, ...renderOptions } = options

  if (auth) {
    authStorage.setUser(auth.user)
    authStorage.setTokens(auth.tokens)
  } else {
    authStorage.clear()
  }

  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
    renderOptions,
  )
}

export const mockAuthPayload: AuthPayload = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "user@example.com",
  },
  tokens: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
  },
}