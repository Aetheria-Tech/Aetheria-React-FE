import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import AppBackground from "@/components/layouts/app-background"
import { useAuth } from "@/context/auth-context"
import { isDevEnvironment } from "@/lib/runtime"

export default function HomePage() {
  const { isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()
  const showLogout = isLoggedIn || isDevEnvironment()

  const handleLogout = () => {
    logout()
    navigate("/", { replace: true })
  }

  return (
    <AppBackground overlayClassName="bg-slate-950/60">
      <header className="w-full px-4 py-4 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-xl sm:px-6">
          <Link to="/" className="transition-opacity hover:opacity-80" aria-label="메인페이지 이동">
            <span className="inline-flex items-center rounded-xl border border-white/25 bg-slate-900/55 px-3 py-2 shadow-lg backdrop-blur-sm">
              <img src="/aetheria-logo.svg" alt="Aetheria 로고" className="h-9 w-auto sm:h-10" />
            </span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="메인 상단 메뉴">
            {showLogout && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-white/30 bg-white/15 text-white hover:bg-white/25"
              >
                로그아웃
              </Button>
            )}
            <Link to="/mypage" aria-label="마이페이지 이동">
              <Button variant="outline" size="sm" className="border-white/30 bg-white/15 text-white hover:bg-white/25">
                마이페이지
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative flex-1 px-4 pb-16 pt-4 sm:px-6 sm:pt-8 lg:px-10">
        <div className="pointer-events-none absolute -left-28 top-14 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-emerald-300/15 blur-3xl" />

        <section className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="space-y-7 rounded-3xl border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-xl sm:p-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white/95">
              <Sparkles className="h-4 w-4 text-cyan-200" />
              러닝 데이터를 감각적인 아트로
            </span>

            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-bold leading-tight text-white drop-shadow-xl md:text-7xl">
                예술이 되는 러닝 경로
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
                출발지와 도착지를 고르고, 경로를 작품처럼 생성하세요.
                매일의 러닝을 기록이 아닌 결과물로 남길 수 있습니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/create" aria-label="러닝아트 만들기">
                <Button className="h-auto w-full bg-cyan-400 px-7 py-3.5 text-base font-semibold text-slate-950 shadow-xl transition-all hover:bg-cyan-300 sm:w-auto">
                  러닝아트 만들기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/gallery" aria-label="갤러리 보기">
                <Button
                  variant="outline"
                  className="h-auto w-full border-white/40 bg-white/10 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/20 sm:w-auto"
                >
                  갤러리 보기
                </Button>
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8" aria-label="미리보기 카드">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/20 bg-black/25 p-5">
                <p className="text-xs uppercase tracking-wider text-cyan-200/90">Preview</p>
                <p className="mt-2 text-lg font-semibold text-white">오늘의 러닝 아트</p>
                <p className="mt-2 text-sm text-white/75">출발/도착 기반 경로를 작품처럼 시각화합니다.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-center">
                  <p className="text-xs text-white/60">경로</p>
                  <p className="mt-1 text-sm font-semibold text-white">생성</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-center">
                  <p className="text-xs text-white/60">상세</p>
                  <p className="mt-1 text-sm font-semibold text-white">관리</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-center">
                  <p className="text-xs text-white/60">공유</p>
                  <p className="mt-1 text-sm font-semibold text-white">가능</p>
                </div>
              </div>
              <Link to="/mypage" aria-label="마이페이지로 이동">
                <Button variant="outline" className="w-full border-white/35 bg-white/10 text-white hover:bg-white/20">
                  내 작품 관리하기
                </Button>
              </Link>
            </div>
          </aside>
        </section>

        <section className="mx-auto mt-10 grid w-full max-w-6xl gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:bg-white/15">
            <h2 className="text-lg font-semibold text-white">내 위치 기반 경로</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              입력한 위치를 바탕으로 러닝 플로우를 구성합니다.
            </p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:bg-white/15">
            <h2 className="text-lg font-semibold text-white">아트처럼 보이는 러닝</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              단순 기록이 아닌 감상 가능한 결과물 형태로 남깁니다.
            </p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 hover:bg-white/15">
            <h2 className="text-lg font-semibold text-white">공유 및 관리</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              마이페이지에서 상세 확인, 수정, 삭제, 공유를 관리합니다.
            </p>
          </article>
        </section>

        <section className="mx-auto mt-10 w-full max-w-6xl rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl sm:p-8">
          <h2 className="text-xl font-semibold text-white">어떻게 동작하나요?</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/15 bg-black/20 p-4">
              <p className="text-xs text-white/60">STEP 1</p>
              <p className="mt-2 font-semibold text-white">출발/도착 선택</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/20 p-4">
              <p className="text-xs text-white/60">STEP 2</p>
              <p className="mt-2 font-semibold text-white">경로 생성</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/20 p-4">
              <p className="text-xs text-white/60">STEP 3</p>
              <p className="mt-2 font-semibold text-white">저장/공유</p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 w-full max-w-6xl rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75 sm:p-5" aria-label="안내 문구">
          개발 중 기능은 로컬/Mock 환경에서 우선 확인할 수 있으며, 백엔드 연동 단계에서 실제 데이터 흐름이 연결됩니다.
        </section>
      </main>

      <footer className="w-full border-t border-white/10 px-4 py-7 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-white/70">(c) 2025 Aetheria. 모든 권리 보유.</p>
          <div className="flex items-center gap-5">
            <Link to="/about" className="text-sm text-white/70 transition-colors hover:text-white">
              서비스 소개
            </Link>
            <Link to="/terms" className="text-sm text-white/70 transition-colors hover:text-white">
              이용약관
            </Link>
            <Link to="/privacy" className="text-sm text-white/70 transition-colors hover:text-white">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </footer>
    </AppBackground>
  )
}
