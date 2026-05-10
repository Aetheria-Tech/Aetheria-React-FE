import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import GlobalHeader from "@/components/layouts/global-header"

export default function SharePage() {
  return (
    <div className="min-h-screen bg-[#0a0f29] text-white">
      <GlobalHeader />
      <div className="mx-auto max-w-3xl space-y-6 px-6 pb-10 pt-24">
        <div className="flex items-center gap-3">
          <Link to="/mypage">
            <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4" />
              마이페이지로
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold">공유 기능 미지원</h1>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
          <p className="text-white/80">현재 백엔드 API 계약에는 공개 공유 조회와 공개 상태 변경 기능이 없습니다.</p>
          <p className="text-sm text-white/60">생성한 러닝아트는 마이페이지에서 확인할 수 있습니다.</p>
        </div>
      </div>
    </div>
  )
}
