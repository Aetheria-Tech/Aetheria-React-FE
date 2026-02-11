import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, MapPin, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AppBackground from "@/components/layouts/app-background"
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
  }, [formData.proficiency, proficiencyOptions])

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

    // Create art via the backend so GPX + image stay in sync.
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
    <AppBackground overlayClassName="bg-black/50">
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/20">
            <ArrowLeft className="w-4 h-4" />
            뒤로
          </Button>
        </Link>
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%202025%EB%85%84%2011%EC%9B%94%2012%EC%9D%BC%20%EC%98%A4%ED%9B%84%2006_49_46-KkdNi8eRKRtmyvGjfBZ8KIzSsAc6s4.png"
            alt="Aetheria 로고"
            className="h-8 object-contain"
          />
        </Link>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">러닝 아트 생성</h1>
            <p className="text-white/80 text-lg">거리, 테마, 출발/도착지를 입력해 경로를 생성하세요.</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="proficiency" className="text-white text-base">
                  거리
                </Label>
                <Select
                  value={formData.proficiency}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, proficiency: value }))}
                >
                  <SelectTrigger id="proficiency" className="bg-white/20 border-white/30 text-white">
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
                <Label htmlFor="theme" className="text-white text-base">
                  테마
                </Label>
                <Input
                  id="theme"
                  placeholder="하트, 별, 나비..."
                  value={formData.theme}
                  onChange={(event) => setFormData((prev) => ({ ...prev, theme: event.target.value }))}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
                />
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="start_point" className="text-white text-base">
                  출발지
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 z-10" />
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
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pl-10"
                  />
                </div>
                {showStartResults && startAddressResults.length > 0 && (
                  <div className="absolute z-50 w-full bg-white/95 backdrop-blur-md rounded-lg mt-1 border border-white/30 max-h-48 overflow-y-auto">
                    {startAddressResults.map((result) => (
                      <button
                        key={`${result.addressName}-${result.x}-${result.y}`}
                        onClick={() => handleAddressSelect(result, true)}
                        className="w-full text-left px-4 py-2 hover:bg-purple-100 transition-colors text-sm text-gray-800"
                      >
                        {result.addressName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="end_point" className="text-white text-base">
                  도착지
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 z-10" />
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
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/50 pl-10"
                  />
                </div>
                {showEndResults && endAddressResults.length > 0 && (
                  <div className="absolute z-50 w-full bg-white/95 backdrop-blur-md rounded-lg mt-1 border border-white/30 max-h-48 overflow-y-auto">
                    {endAddressResults.map((result) => (
                      <button
                        key={`${result.addressName}-${result.x}-${result.y}`}
                        onClick={() => handleAddressSelect(result, false)}
                        className="w-full text-left px-4 py-2 hover:bg-purple-100 transition-colors text-sm text-gray-800"
                      >
                        {result.addressName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white py-6 text-lg font-semibold"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    작품 생성
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </AppBackground>
  )
}
