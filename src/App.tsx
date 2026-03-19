import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ProtectedRoute } from "@/components/protected-route"

const HomePage = lazy(() => import("@/pages/HomePage"))
const CreatePage = lazy(() => import("@/pages/CreatePage"))
const GalleryPage = lazy(() => import("@/pages/GalleryPage"))
const LoginPage = lazy(() => import("@/pages/LoginPage"))
const OAuthCallbackPage = lazy(() => import("@/pages/OAuthCallbackPage"))
const MyPage = lazy(() => import("@/pages/MyPage"))
const MyPageDetail = lazy(() => import("@/pages/MyPageDetail"))
const SharePage = lazy(() => import("@/pages/SharePage"))
const ForbiddenPage = lazy(() => import("@/pages/ForbiddenPage"))
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
        <Route
          path="/mypage"
          element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mypage/:id"
          element={
            <ProtectedRoute>
              <MyPageDetail />
            </ProtectedRoute>
          }
        />
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
