import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"
import { ProtectedRoute } from "@/components/protected-route"
import { renderWithProviders, mockAuthPayload } from "@/test/test-utils"

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to login", async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>비밀</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/protected", auth: null },
    )

    expect(await screen.findByText("로그인 페이지")).toBeInTheDocument()
  })

  it("renders children for authenticated users", async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>비밀</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>로그인 페이지</div>} />
      </Routes>,
      { route: "/protected", auth: mockAuthPayload },
    )

    expect(await screen.findByText("비밀")).toBeInTheDocument()
  })
})
