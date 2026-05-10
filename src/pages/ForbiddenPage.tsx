import { Link } from "react-router-dom"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import GlobalHeader from "@/components/layouts/global-header"

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[#0a0f29]">
      <GlobalHeader />
      <div className="flex items-center justify-center px-6 pb-10 pt-24">
        <div className="text-center space-y-6 max-w-md">
          <ShieldAlert className="w-16 h-16 text-rose-400 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">접근이 거부되었습니다</h1>
            <p className="text-white/70 text-lg">이 작품은 비공개입니다.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/mypage">
              <Button className="bg-[#836FFF] hover:bg-[#6b5acc]">
                마이페이지로
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
