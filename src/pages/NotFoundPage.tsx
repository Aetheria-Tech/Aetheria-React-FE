import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"
import GlobalHeader from "@/components/layouts/global-header"

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <div className="flex items-center justify-center px-6 pb-10 pt-24">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-9xl font-bold text-white">404</h1>
            <h2 className="text-3xl font-bold text-white">페이지를 찾을 수 없습니다</h2>
            <p className="text-white/70 text-lg">요청하신 페이지가 존재하지 않습니다.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary-container">
                <Home className="w-4 h-4" />
                홈으로
              </Button>
            </Link>
            <Link to="/create">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                러닝 아트 만들기
              </Button>
            </Link>
          </div>

          <div className="pt-8">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logoimage-If0HzkvmbETUJ7bKqfpBGjkd2faQfr.png"
              alt="러닝 아트 로고"
              className="w-24 h-24 mx-auto opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
