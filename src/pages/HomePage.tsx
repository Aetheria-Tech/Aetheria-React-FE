import { Link } from "react-router-dom"
import { ArrowUpRight, Facebook, Instagram, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import GlobalHeader from "@/components/layouts/global-header"

export default function HomePage() {
  const { isLoggedIn } = useAuth()
  const createEntryPath = isLoggedIn ? "/create" : "/login"

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <GlobalHeader />

      <main className="snap-y snap-mandatory pt-24">
        <section className="relative snap-start min-h-screen overflow-hidden px-4 py-16 sm:px-8">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mainimage-Y4rlZOTP9RUdC9Xor2mwCYia19aP9V.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-x-0 top-1/2 h-72 -translate-y-1/2 bg-black/55" />
          <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center justify-center">
            <div className="text-center">
              <h1 className="text-balance text-5xl font-black leading-[0.95] text-white md:text-7xl">
                러닝 경로, 그냥 달리기만 하세요
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm text-white/85 sm:text-base">
                아트 생성을 위해 더 이상 고민하지 마세요. 경로는 Aetheria가 작품 형태로 정리합니다.
              </p>
              <Link to="/login" aria-label="회원가입/로그인 페이지 이동">
                <Button className="mt-8 h-auto rounded-full bg-brand px-7 py-2.5 font-black text-zinc-900 hover:bg-brand-hover">
                  JOIN US
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="relative snap-start min-h-screen overflow-hidden bg-gradient-to-br from-[#0a4ea1] via-[#0a66c2] to-[#063f86]">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative flex min-h-screen flex-col">
            <div className="mt-auto flex flex-col gap-4 px-4 pb-8 sm:px-8 sm:pb-10 md:flex-row md:items-end md:justify-between">
              <div className="w-full rounded-xl bg-black/45 p-4 text-sm text-white/90 backdrop-blur-sm md:max-w-lg">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-white/60">Location</p>
                    <p className="mt-1">내 위치 기반 러닝</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-white/60">Date</p>
                    <p className="mt-1">매일 누적되는 기록</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-white/60">Time</p>
                    <p className="mt-1">아침 - 저녁</p>
                  </div>
                </div>
              </div>
              <Link to={createEntryPath} aria-label={isLoggedIn ? "생성페이지 이동" : "회원가입/로그인 페이지 이동"}>
                <Button className="h-auto rounded-full bg-brand px-6 py-2.5 font-black text-zinc-900 hover:bg-brand-hover">
                  REGISTER
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="snap-start grid min-h-screen grid-cols-1 md:grid-cols-2">
          <article className="relative min-h-[50vh] overflow-hidden bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 px-6 py-10 sm:px-10 sm:py-12">
            <div className="absolute inset-0 bg-black/15" />
            <div className="relative">
              <h2 className="text-pretty text-5xl font-black leading-[0.92] text-white sm:text-6xl">초보부터 마라토너까지</h2>
              <p className="mt-4 text-sm text-white/75">속도보다 궤적으로, 매일의 러닝을 시작하세요.</p>
              <Link to="/gallery" aria-label="서비스 소개 보기">
                <Button className="mt-6 h-auto rounded-full bg-brand px-6 py-2.5 font-black text-zinc-900 hover:bg-brand-hover">
                  ABOUT US
                </Button>
              </Link>
            </div>
          </article>

          <article className="min-h-[50vh] bg-zinc-900 px-6 py-10 sm:px-10 sm:py-12">
            <h2 className="text-pretty text-5xl font-black leading-[0.92] text-white sm:text-6xl">기록하고 공유하고 달리세요</h2>
            <p className="mt-4 text-sm text-white/75">매번의 러닝을 하나의 작품으로 남겨보세요.</p>
            <Link to="/gallery" aria-label="갤러리 페이지 이동">
              <Button className="mt-6 h-auto rounded-full bg-zinc-700 px-6 py-2.5 font-black text-brand hover:bg-zinc-600">
                NEWSLETTER
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </article>
        </section>

        <section className="snap-start min-h-screen bg-brand-surface px-4 py-10 text-zinc-900 sm:px-8 sm:py-12">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-between">
            <h2 className="max-w-4xl text-3xl font-black leading-tight sm:text-5xl">
              아테리아는 당신의 다음 러닝 아트를 기다리고 있습니다.
            </h2>
            <Link to="/create" aria-label="등록하기">
              <Button className="h-auto rounded-full bg-zinc-800 px-5 py-2.5 font-black text-brand hover:bg-zinc-700">
                REGISTER
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <footer className="relative snap-start min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 text-white sm:px-8 sm:py-14">
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-transparent to-black/70" />
          <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl flex-col justify-between">
            <div className="grid gap-8 md:grid-cols-[1fr_auto]">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-white/60">Email</p>
                  <p className="text-sm text-white/85">contact@aetheria.run</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-white/60">Sponsorship</p>
                  <p className="text-sm text-white/85">공식 파트너 문의를 받고 있습니다.</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase text-white/60">Socials</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-white/30 bg-black/50 text-white hover:bg-white/10"
                    aria-label="인스타그램"
                  >
                    <Instagram className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-white/30 bg-black/50 text-white hover:bg-white/10"
                    aria-label="트위터"
                  >
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-white/30 bg-black/50 text-white hover:bg-white/10"
                    aria-label="페이스북"
                  >
                    <Facebook className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-5xl font-black tracking-tight text-white/95 sm:text-8xl">Aetheria</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
