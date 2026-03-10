import { useEffect, useMemo, useState } from "react"
import { MapPin, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AppBackground from "@/components/layouts/app-background"
import GlobalHeader from "@/components/layouts/global-header"
import { normalizeLatLngTuple, toLatLngFromKakao } from "@/lib/coords"
import { saveStoredGeocode } from "@/mocks/geocode-map"
import { addressToCoords, searchAddress as searchKakaoAddress } from "@/services/kakao-service"
import { useCreateArt } from "@/hooks/use-create-art"
import { useToast } from "@/context/toast-context"
import type { CreateArtPayload } from "@/types/art"
import type { LatLng } from "@/lib/coords"
import type { KakaoAddressResult } from "@/services/kakao-service"

const proficiencyOptions = [
  { value: "beginner", label: "초급 (3km)", distance: 3 },
  { value: "intermediate", label: "중급 (10km)", distance: 10 },
  { value: "advanced", label: "고급 (20km)", distance: 20 },
  { value: "marathon", label: "마라톤 (40km)", distance: 40 },
]

export default function CreatePage() {
  const { notify } = useToast()
  const { createArt, isLoading } = useCreateArt()

  const [formData, setFormData] = useState({
    proficiency: "",
    theme: "",
    startPoint: "",
    endPoint: "",
  })

  const [startCoords, setStartCoords] = useState<LatLng | null>(null)
  const [endCoords, setEndCoords] = useState<LatLng | null>(null)
  const [showStartResults, setShowStartResults] = useState(false)
  const [showEndResults, setShowEndResults] = useState(false)
  const [startAddressResults, setStartAddressResults] = useState<KakaoAddressResult[]>([])
  const [endAddressResults, setEndAddressResults] = useState<KakaoAddressResult[]>([])

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const selectedDistance = useMemo(() => {
    return proficiencyOptions.find((option) => option.value === formData.proficiency)?.distance ?? 0
  }, [formData.proficiency])

  const searchAddress = async (query: string, isStart: boolean) => {
    if (query.length < 2) {
      if (isStart) setStartAddressResults([])
      else setEndAddressResults([])
      return
    }

    try {
      const results = await searchKakaoAddress(query)
      if (isStart) {
        setStartAddressResults(results)
        setShowStartResults(true)
      } else {
        setEndAddressResults(results)
        setShowEndResults(true)
      }
    } catch {
      notify("주소 검색에 실패했습니다.", "error")
    }
  }

  const handleAddressSelect = (address: KakaoAddressResult, isStart: boolean) => {
    const coords = toLatLngFromKakao(address)
    if (!coords) return

    if (isStart) {
      setFormData((prev) => ({ ...prev, startPoint: address.addressName }))
      setStartCoords(coords)
      setShowStartResults(false)
    } else {
      setFormData((prev) => ({ ...prev, endPoint: address.addressName }))
      setEndCoords(coords)
      setShowEndResults(false)
    }
    saveStoredGeocode({
      keyword: address.addressName,
      latitude: coords[0],
      longitude: coords[1],
      formattedAddress: address.addressName,
    })
  }

  const resolveCoordsForAddress = async (
    address: string,
    existing: LatLng | null,
  ): Promise<LatLng | null> => {
    const normalizedExisting = normalizeLatLngTuple(existing)
    if (normalizedExisting) return normalizedExisting

    const normalizedAddress = address.trim()
    if (!normalizedAddress) return null

    try {
      const result = await addressToCoords(normalizedAddress)
      const coords = toLatLngFromKakao(result)
      if (!coords) return null
      saveStoredGeocode({
        keyword: normalizedAddress,
        latitude: coords[0],
        longitude: coords[1],
        formattedAddress: normalizedAddress,
      })
      return coords
    } catch {
      notify("주소 좌표를 가져오지 못했습니다.", "error")
      return null
    }
  }

  const handleGenerate = async () => {
    const [resolvedStart, resolvedEnd] = await Promise.all([
      resolveCoordsForAddress(formData.startPoint, startCoords),
      resolveCoordsForAddress(formData.endPoint, endCoords),
    ])

    if (!selectedDistance || !formData.theme || !resolvedStart || !resolvedEnd) {
      notify("거리, 테마, 출발지, 도착지를 모두 입력해 주세요.", "error")
      return
    }

    setStartCoords(resolvedStart)
    setEndCoords(resolvedEnd)

    const payload: CreateArtPayload = {
      distanceKm: selectedDistance,
      theme: formData.theme,
      startAddress: formData.startPoint,
      endAddress: formData.endPoint,
      startCoords: { lat: resolvedStart[0], lng: resolvedStart[1] },
      endCoords: { lat: resolvedEnd[0], lng: resolvedEnd[1] },
    }

    try {
      await createArt(payload)
    } catch {
      // Errors are surfaced via toast in the hook.
    }
  }

  const openDaumPostcode = (isStart: boolean) => {
    if (!window.daum?.Postcode) {
      notify("주소 검색이 아직 로딩 중입니다.", "error")
      return
    }

    new window.daum.Postcode({
      oncomplete: async (data: { address: string }) => {
        const address = data.address
        if (isStart) {
          setFormData((prev) => ({ ...prev, startPoint: address }))
        } else {
          setFormData((prev) => ({ ...prev, endPoint: address }))
        }

        try {
          const result = await addressToCoords(address)
          if (result) {
            const coords = toLatLngFromKakao(result)
            if (coords) {
              if (isStart) {
                setStartCoords(coords)
              } else {
                setEndCoords(coords)
              }
              saveStoredGeocode({
                keyword: address,
                latitude: coords[0],
                longitude: coords[1],
                formattedAddress: address,
              })
            }
          }
        } catch {
          notify("선택한 주소의 좌표를 가져오지 못했습니다.", "error")
        }

        setShowStartResults(false)
        setShowEndResults(false)
        setStartAddressResults([])
        setEndAddressResults([])
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
            <p className="mt-3 text-sm text-white/80 sm:text-base">거리, 테마, 출발/도착지를 입력해 경로를 생성하세요.</p>
          </section>

          <div className="mx-auto max-w-3xl">
            <section className="rounded-2xl border border-white/20 bg-black/35 p-6 shadow-2xl backdrop-blur-md sm:p-8">
              <h2 className="text-2xl font-black text-white">생성 설정</h2>
              <p className="mt-2 text-sm text-white/70">필수 항목을 입력하면 바로 작품 생성을 시작할 수 있습니다.</p>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="proficiency" className="text-sm font-semibold text-white/90">
                    거리
                  </Label>
                  <Select
                    value={formData.proficiency}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, proficiency: value }))}
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
                      onClick={() => openDaumPostcode(true)}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setFormData((prev) => ({ ...prev, startPoint: nextValue }))
                        if (nextValue !== formData.startPoint) {
                          setStartCoords(null)
                        }
                        searchAddress(nextValue, true)
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
                          onClick={() => handleAddressSelect(result, true)}
                          className="w-full px-4 py-2 text-left text-sm text-white/90 transition-colors hover:bg-white/10"
                        >
                          {result.addressName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative space-y-2">
                  <Label htmlFor="end_point" className="text-sm font-semibold text-white/90">
                    도착지
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <Input
                      id="end_point"
                      placeholder="주소 검색"
                      value={formData.endPoint}
                      onClick={() => openDaumPostcode(false)}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setFormData((prev) => ({ ...prev, endPoint: nextValue }))
                        if (nextValue !== formData.endPoint) {
                          setEndCoords(null)
                        }
                        searchAddress(nextValue, false)
                      }}
                      onFocus={() => {
                        if (endAddressResults.length > 0) {
                          setShowEndResults(true)
                        }
                      }}
                      className="border-white/30 bg-white/10 pl-10 text-white placeholder:text-white/50"
                    />
                  </div>
                  {showEndResults && endAddressResults.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/20 bg-zinc-900/95 backdrop-blur-md">
                      {endAddressResults.map((result) => (
                        <button
                          key={`${result.addressName}-${result.x}-${result.y}`}
                          onClick={() => handleAddressSelect(result, false)}
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
                    className="mt-4 w-full rounded-full bg-[#80e87a] py-6 text-base font-black text-zinc-900 hover:bg-[#9cf397]"
                  >
                    {isLoading ? (
                      <>
                        <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                        생성 중...
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
