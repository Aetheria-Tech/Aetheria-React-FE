import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import AppBackground from "@/components/layouts/app-background"

export default function HomePage() {
  return (
    <AppBackground overlayClassName="bg-black/40">
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%202025%EB%85%84%2011%EC%9B%94%2012%EC%9D%BC%20%EC%98%A4%ED%9B%84%2006_49_46-KkdNi8eRKRtmyvGjfBZ8KIzSsAc6s4.png"
            alt="Aetheria 로고"
            className="h-10 object-contain"
          />
        </Link>

        <Link to="/mypage">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-white/30 backdrop-blur-sm border-white/30 text-white hover:bg-white/40"
          >
            마이페이지
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full text-center space-y-8">
          <div className="space-y-6">
            <div className="inline-block">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium border border-white/30">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                맞춤형 러닝 아트
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight text-balance drop-shadow-2xl">
              예술이 되는 러닝 경로
              <br />
              <span className="text-purple-300">당신의 러닝으로 완성됩니다</span>
            </h1>

            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed text-pretty drop-shadow-lg">
              러닝 경로를 감각적인 작품으로 바꿔 보세요.
              <br />
              매번의 러닝을 하나의 창작물로 남기세요.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/create">
              <Button
                size="lg"
                className="text-lg px-8 py-6 h-auto font-semibold bg-purple-500 hover:bg-purple-600 text-white shadow-2xl"
              >
                작품 생성하기
              </Button>
            </Link>
            <Link to="/gallery">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 h-auto font-semibold bg-white/30 backdrop-blur-sm border-white/30 text-white hover:bg-white/40"
              >
                갤러리 보기
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="p-6 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 space-y-3 text-left hover:bg-white/25 transition-all">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6 text-purple-300"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">GPS 경로 기록</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                러닝을 정확히 기록해 작품이 되는 경로를 만듭니다.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 space-y-3 text-left hover:bg-white/25 transition-all">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6 text-purple-300"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">AI 경로 스타일링</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                선택한 테마에 맞춰 경로를 예술적으로 시각화합니다.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 space-y-3 text-left hover:bg-white/25 transition-all">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6 text-purple-300"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">커뮤니티와 공유</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                작품을 공개하고 다른 러너들의 경로를 탐색하세요.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full px-6 py-8 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/70">(c) 2025 Aetheria. 모든 권리 보유.</p>
          <div className="flex items-center gap-6">
            <Link to="/about" className="text-sm text-white/70 hover:text-white transition-colors">
              서비스 소개
            </Link>
            <Link to="/terms" className="text-sm text-white/70 hover:text-white transition-colors">
              이용약관
            </Link>
            <Link to="/privacy" className="text-sm text-white/70 hover:text-white transition-colors">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </footer>
    </AppBackground>
  )
}
