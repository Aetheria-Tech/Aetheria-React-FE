import { Link } from "react-router-dom"
import { ArrowUpRight, Facebook, Instagram, Twitter } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import GlobalHeader from "@/components/layouts/global-header"
import aetheriaBackground from "@/assets/배경화면.png"
import dogSkeleton from "@/assets/dog skel.png"
import flowerSkeleton from "@/assets/flower skele.png"

export default function HomePage() {
  const { isLoggedIn } = useAuth()
  // 로그인 사용자는 생성 화면으로, 게스트는 로그인 화면으로 CTA를 연결한다.
  const createEntryPath = isLoggedIn ? "/create" : "/login"
  // const myArtsEntryPath = isLoggedIn ? "/mypage" : "/login"
  const supportsIntersectionObserver = typeof window !== "undefined" && "IntersectionObserver" in window
  const communitySectionRef = useRef<HTMLElement | null>(null)
  const [isCommunitySectionVisible, setIsCommunitySectionVisible] = useState(() => !supportsIntersectionObserver)

  useEffect(() => {
    const section = communitySectionRef.current
    if (!supportsIntersectionObserver || !section) {
      setIsCommunitySectionVisible(true)
      return
    }

    let revealTimer: number | null = null
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return

        if (entry.intersectionRatio >= 0.55) {
          if (revealTimer !== null) {
            window.clearTimeout(revealTimer)
          }
          revealTimer = window.setTimeout(() => setIsCommunitySectionVisible(true), 120)
          return
        }

        if (entry.intersectionRatio <= 0.15) {
          if (revealTimer !== null) {
            window.clearTimeout(revealTimer)
            revealTimer = null
          }
          setIsCommunitySectionVisible(false)
        }
      },
      { threshold: [0.15, 0.55] },
    )

    observer.observe(section)
    return () => {
      if (revealTimer !== null) {
        window.clearTimeout(revealTimer)
      }
      observer.disconnect()
    }
  }, [supportsIntersectionObserver])

  const communityRevealClass = isCommunitySectionVisible ? "translate-y-0 opacity-100 blur-0" : "translate-y-24 opacity-0 blur-sm"

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <GlobalHeader />

      <main className="snap-y snap-mandatory pt-24">
        <section className="relative snap-start min-h-screen overflow-hidden px-4 py-16 sm:px-8">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${aetheriaBackground})`,
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
              <Link to={createEntryPath} aria-label={isLoggedIn ? "생성페이지 이동" : "회원가입/로그인 페이지 이동"}>
                <Button className="mt-8 h-auto rounded-full bg-brand px-7 py-2.5 font-black text-zinc-900 hover:bg-brand-hover">
                  JOIN US
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/*
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
              <Link to={createEntryPath} aria-label="러닝 아트 생성 시작">
                <Button className="mt-6 h-auto rounded-full bg-brand px-6 py-2.5 font-black text-zinc-900 hover:bg-brand-hover">
                  START
                </Button>
              </Link>
            </div>
          </article>

          <article className="min-h-[50vh] bg-zinc-900 px-6 py-10 sm:px-10 sm:py-12">
            <h2 className="text-pretty text-5xl font-black leading-[0.92] text-white sm:text-6xl">기록하고 관리하며 달리세요</h2>
            <p className="mt-4 text-sm text-white/75">매번의 러닝을 하나의 작품으로 남겨보세요.</p>
            <Link to={myArtsEntryPath} aria-label="내 러닝 아트 목록 이동">
              <Button className="mt-6 h-auto rounded-full bg-zinc-700 px-6 py-2.5 font-black text-brand hover:bg-zinc-600">
                MY ARTS
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </article>
        </section>
        */}

        <section
          ref={communitySectionRef}
          className="snap-start min-h-screen bg-brand-surface px-4 py-16 text-zinc-950 sm:px-8 sm:py-20"
        >
          <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div
              className={`z-10 flex flex-col gap-7 transition-all duration-1000 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 lg:col-span-6 ${communityRevealClass}`}
            >
              <h2 className="text-pretty text-5xl font-black leading-[0.9] tracking-tighter sm:text-6xl lg:text-7xl">
                <span className="block">아테리아는</span>
                <span className="block">당신의 다음</span>
                <span className="block">러닝 아트를</span>
                <span className="block">기다립니다.</span>
              </h2>

              <div className="flex max-w-md flex-col gap-4">
                <p className="text-lg font-medium leading-snug text-black/80 sm:text-xl">
                  거리와 테마, 출발지만 정하면 달릴 수 있는 경로가 준비됩니다.
                </p>
              </div>

              <div className="mt-1">
                <Link to={createEntryPath} aria-label={isLoggedIn ? "러닝 아트 생성하기" : "로그인 후 러닝 아트 생성하기"}>
                  <Button className="group h-auto rounded-full bg-black px-7 py-3 font-black text-white transition-all hover:bg-black/90 active:scale-95 focus-visible:ring-black/40">
                    러닝 아트 만들기
                    <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative flex min-h-[460px] items-center justify-center overflow-hidden sm:min-h-[560px] lg:col-span-6 lg:min-h-[640px]">
              <div className="absolute h-[320px] w-[320px] rounded-full bg-white/20 blur-3xl sm:h-[420px] sm:w-[420px]" />
              <div className="relative aspect-square w-full max-w-lg">
                <div
                  className={`absolute right-0 top-0 z-20 w-[85%] translate-x-4 -rotate-3 overflow-hidden rounded-lg border border-white/50 bg-white p-2 shadow-2xl transition-all delay-150 duration-1000 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 ${communityRevealClass}`}
                >
                  <img src={flowerSkeleton} alt="꽃 모양 러닝 아트 예시" className="h-auto w-full rounded-md" />
                </div>
                <div
                  className={`absolute bottom-4 left-0 z-10 w-[85%] -translate-x-4 rotate-2 overflow-hidden rounded-lg border border-white/50 bg-white p-2 shadow-2xl transition-all delay-300 duration-1000 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 ${communityRevealClass}`}
                >
                  <img src={dogSkeleton} alt="강아지 모양 러닝 아트 예시" className="h-auto w-full rounded-md" />
                </div>
              </div>
            </div>
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
