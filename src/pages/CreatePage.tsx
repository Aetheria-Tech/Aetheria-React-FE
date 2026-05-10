import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AppBackground from "@/components/layouts/app-background"
import GlobalHeader from "@/components/layouts/global-header"
import { toLatLngFromKakao } from "@/lib/coords"
import { saveStoredGeocode } from "@/mocks/geocode-map"
import { searchAddress as searchKakaoAddress } from "@/services/kakao-service"
import { useCreateArt } from "@/hooks/use-create-art"
import { useToast } from "@/context/toast-context"
import type { RunningArtProficiency } from "@/types/running-art"
import type { KakaoAddressResult } from "@/services/kakao-service"

const proficiencyOptions: Array<{ value: RunningArtProficiency; label: string }> = [
  { value: "INTRODUCTION", label: "입문 (3km)" },
  { value: "BEGINNER", label: "초급 (10km)" },
  { value: "SKILLED", label: "중급 (20km)" },
  { value: "EXPERT", label: "전문가 (40km)" },
]

export default function CreatePage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { createArt, isLoading } = useCreateArt()

  const [formData, setFormData] = useState<{
    proficiency: RunningArtProficiency | ""
    theme: string
    startPoint: string
  }>({
    proficiency: "",
    theme: "",
    startPoint: "",
  })

  const [showStartResults, setShowStartResults] = useState(false)
  const [startAddressResults, setStartAddressResults] = useState<KakaoAddressResult[]>([])

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const searchAddress = async (query: string) => {
    if (query.length < 2) {
      setStartAddressResults([])
      return
    }

    try {
      const results = await searchKakaoAddress(query)
      setStartAddressResults(results)
      setShowStartResults(true)
    } catch {
      notify("주소 검색에 실패했습니다.", "error")
    }
  }

  const handleAddressSelect = (address: KakaoAddressResult) => {
    setFormData((prev) => ({ ...prev, startPoint: address.addressName }))
    setShowStartResults(false)

    // 선택한 주소의 좌표를 저장해 생성 요청에서 같은 주소를 다시 해석할 때 재사용한다.
    const coords = toLatLngFromKakao(address)
    if (!coords) return

    saveStoredGeocode({
      keyword: address.addressName,
      latitude: coords[0],
      longitude: coords[1],
      formattedAddress: address.addressName,
    })
  }

  const handleGenerate = async () => {
    const startPosition = formData.startPoint.trim()
    const shape = formData.theme.trim()

    if (!formData.proficiency || !shape || !startPosition) {
      notify("거리, 테마, 출발지를 모두 입력해 주세요.", "error")
      return
    }

    try {
      const response = await createArt({
        startPosition,
        shape,
        proficiency: formData.proficiency,
      })

      // 생성 결과는 비동기 task로 추적하므로 taskId 기반 상태 화면으로 이동한다.
      navigate(`/mypage/tasks/${response.taskId}`, { replace: true })
    } catch {
      // Errors are surfaced via toast in the hook.
    }
  }

  const openDaumPostcode = () => {
    if (!window.daum?.Postcode) {
      notify("주소 검색이 아직 로딩 중입니다.", "error")
      return
    }

    new window.daum.Postcode({
      oncomplete: (data: { address: string }) => {
        setFormData((prev) => ({ ...prev, startPoint: data.address }))
        setShowStartResults(false)
        setStartAddressResults([])
      },
    }).open()
  }

  return (
    <AppBackground overlayClassName="bg-black/55">
      <GlobalHeader />

      <main className="flex-1 px-4 pb-10 pt-24 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="text-center">
            <h1 className="text-4xl font-black text-white sm:text-5xl">러닝 경로 생성</h1>
            <p className="mt-3 text-sm text-white/80 sm:text-base">거리, 테마, 출발지를 입력해 경로를 생성하세요.</p>
          </section>

          <div className="mx-auto max-w-3xl">
            <section className="rounded-2xl border border-white/20 bg-black/35 p-6 shadow-2xl backdrop-blur-md sm:p-8">
              <h2 className="text-2xl font-black text-white">생성 설정</h2>
              <p className="mt-2 text-sm text-white/70">생성 요청 후 전용 화면으로 이동해 진행 상태를 확인할 수 있습니다.</p>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="proficiency" className="text-sm font-semibold text-white/90">
                    거리
                  </Label>
                  <Select
                    value={formData.proficiency}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, proficiency: value as RunningArtProficiency }))
                    }
                  >
                    <SelectTrigger id="proficiency" className="border-white/30 bg-white/10 text-white">
                      <SelectValue placeholder="거리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {proficiencyOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-sm font-semibold text-white/90">
                    테마
                  </Label>
                  <Input
                    id="theme"
                    placeholder="하트, 별, 나비..."
                    value={formData.theme}
                    onChange={(event) => setFormData((prev) => ({ ...prev, theme: event.target.value }))}
                    className="border-white/30 bg-white/10 text-white placeholder:text-white/50"
                  />
                </div>

                <div className="relative space-y-2">
                  <Label htmlFor="start_point" className="text-sm font-semibold text-white/90">
                    출발지
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <Input
                      id="start_point"
                      placeholder="주소 검색"
                      value={formData.startPoint}
                      onClick={openDaumPostcode}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setFormData((prev) => ({ ...prev, startPoint: nextValue }))
                        searchAddress(nextValue)
                      }}
                      onFocus={() => {
                        if (startAddressResults.length > 0) {
                          setShowStartResults(true)
                        }
                      }}
                      className="border-white/30 bg-white/10 pl-10 text-white placeholder:text-white/50"
                    />
                  </div>
                  {showStartResults && startAddressResults.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/20 bg-zinc-900/95 backdrop-blur-md">
                      {startAddressResults.map((result) => (
                        <button
                          key={`${result.addressName}-${result.x}-${result.y}`}
                          onClick={() => handleAddressSelect(result)}
                          className="w-full px-4 py-2 text-left text-sm text-white/90 transition-colors hover:bg-white/10"
                        >
                          {result.addressName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <p className="text-xs text-white/60">액션</p>
                  <p className="mt-1 text-sm text-white/80">입력값을 확인한 뒤 작품 생성을 시작하세요.</p>
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="mt-4 w-full rounded-full bg-brand py-6 text-base font-black text-zinc-900 hover:bg-brand-hover"
                  >
                    {isLoading ? (
                      <>
                        <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                        생성 요청 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        작품 생성
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </AppBackground>
  )
}
