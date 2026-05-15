import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import GlobalHeader from "@/components/layouts/global-header"
import ShootingStars from "@/components/shooting-stars"
import { toLatLngFromKakao } from "@/lib/coords"
import { getRouteStepDisplayValue } from "@/lib/route-step-display"
import { saveStoredGeocode } from "@/mocks/geocode-map"
import { searchAddress as searchKakaoAddress } from "@/services/kakao-service"
import { useCreateArt } from "@/hooks/use-create-art"
import { useToast } from "@/context/toast-context"
import type { RunningArtProficiency } from "@/types/running-art"
import type { KakaoAddressResult } from "@/services/kakao-service"

const proficiencyOptions: Array<{ value: RunningArtProficiency; label: string }> = [
  { value: "INTRODUCTION", label: "3km" },
  { value: "BEGINNER", label: "10km" },
  { value: "SKILLED", label: "20km" },
  { value: "EXPERT", label: "40km" },
]

const routePath = "M 70 235 C 178 120 288 122 372 214 S 560 252 650 140"
const routeMarkerPositions = [
  { x: 192, y: 153 },
  { x: 500, y: 258 },
  { x: 650, y: 140 },
] as const
const runnerPositions = [{ x: 70, y: 235 }, ...routeMarkerPositions] as const

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

  const selectedProficiencyLabel =
    proficiencyOptions.find((option) => option.value === formData.proficiency)?.label ?? ""
  const routeProgressSteps = [
    {
      label: "거리",
      value: selectedProficiencyLabel,
      completed: Boolean(formData.proficiency),
    },
    {
      label: "테마",
      value: formData.theme.trim(),
      completed: formData.theme.trim().length > 0,
    },
    {
      label: "출발지",
      value: formData.startPoint.trim(),
      completed: formData.startPoint.trim().length > 0,
    },
  ]
  const completedOptionCount = routeProgressSteps.filter((step) => step.completed).length
  const activeRouteStepIndex = routeProgressSteps.findIndex((step) => !step.completed)
  const routeProgressPercent = Math.round((completedOptionCount / routeProgressSteps.length) * 100)
  const runnerPosition = runnerPositions[completedOptionCount]

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-container text-white">
      <ShootingStars />
      <div className="relative z-10 flex min-h-screen flex-col">
        <GlobalHeader />

        <main className="relative flex min-h-screen flex-col overflow-hidden px-4 pb-6 pt-24 sm:px-8">
          <section className="absolute inset-0 overflow-hidden bg-surface-container-lowest">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
                backgroundSize: "42px 42px",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent_46%)]" />
            <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-surface-container via-surface-container/80 to-transparent" />
            <div
              role="progressbar"
              aria-label="생성 옵션 진행도"
              aria-valuemin={0}
              aria-valuemax={routeProgressSteps.length}
              aria-valuenow={completedOptionCount}
              className="absolute inset-0 z-10 flex items-center justify-center px-4 pb-44 pt-20 sm:pb-52"
            >
              <svg aria-hidden="true" viewBox="0 0 720 360" className="h-full max-h-[76vh] w-full max-w-[1500px] overflow-visible">
                    <defs>
                      <linearGradient id="create-route-progress" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="55%" stopColor="#c7c6c6" />
                        <stop offset="100%" stopColor="#8e9192" />
                      </linearGradient>
                      <filter id="create-route-glow">
                        <feGaussianBlur result="blur" stdDeviation="4" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      id="create-route-base"
                      d={routePath}
                      fill="none"
                      stroke="rgba(255,255,255,0.24)"
                      strokeLinecap="round"
                      strokeWidth="15"
                    />
                    <path
                      d={routePath}
                      fill="none"
                      filter="url(#create-route-glow)"
                      pathLength={100}
                      stroke="url(#create-route-progress)"
                      strokeDasharray={`${routeProgressPercent} 100`}
                      strokeLinecap="round"
                      strokeWidth="15"
                      style={{ transition: "stroke-dasharray 520ms ease" }}
                    />
                    <path
                      d={routePath}
                      fill="none"
                      filter="url(#create-route-glow)"
                      pathLength={100}
                      stroke="rgba(255,255,255,0.8)"
                      strokeDasharray="10 120"
                      strokeLinecap="round"
                      strokeWidth="15"
                      className="create-route-flow"
                    />
                    {routeProgressSteps.map((step, index) => {
                      const marker = routeMarkerPositions[index]
                      const isCompleted = step.completed
                      const isActiveMarker =
                        !isCompleted &&
                        activeRouteStepIndex === index &&
                        completedOptionCount < routeProgressSteps.length
                      return (
                        <g key={`route-marker-${index}`}>
                          {isCompleted && (
                            <g transform={`translate(${marker.x} ${marker.y - 62})`}>
                              <text
                                fill="rgba(255,255,255,0.95)"
                                fontSize="18"
                                fontWeight="800"
                                textAnchor="middle"
                              >
                                {step.label}
                              </text>
                              <text
                                y="28"
                                fill="rgba(255,255,255,0.62)"
                                fontSize="16"
                                fontWeight="700"
                                textAnchor="middle"
                              >
                                {getRouteStepDisplayValue(step.value)}
                              </text>
                            </g>
                          )}
                          {isActiveMarker && (
                            <circle
                              cx={marker.x}
                              cy={marker.y}
                              fill="none"
                              r="28"
                              stroke="rgba(255,255,255,0.28)"
                              strokeWidth="8"
                              className="create-route-marker"
                            />
                          )}
                          <circle
                            cx={marker.x}
                            cy={marker.y}
                            fill={isCompleted ? "#ffffff" : "rgba(255,255,255,0.1)"}
                            r="18"
                            stroke={isCompleted ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.28)"}
                            strokeWidth="6"
                            style={{ transition: "fill 260ms ease, stroke 260ms ease" }}
                          />
                          {isCompleted && (
                            <path
                              d={`M ${marker.x - 4} ${marker.y} L ${marker.x - 1} ${marker.y + 4} L ${marker.x + 6} ${
                                marker.y - 5
                              }`}
                              fill="none"
                              stroke="#2f3131"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="5"
                            />
                          )}
                        </g>
                      )
                    })}
                    <g
                      style={{
                        transform: `translate(${runnerPosition.x}px, ${runnerPosition.y}px)`,
                        transition: "transform 520ms ease",
                      }}
                    >
                      <circle fill="rgba(255,255,255,0.22)" r="25" />
                      <circle fill="#ffffff" r="11" stroke="#8e9192" strokeWidth="3" />
                    </g>
              </svg>
            </div>
          </section>

          <div className="pointer-events-none relative z-20 flex min-h-[calc(100vh-7.5rem)] flex-col justify-between">
            <div className="pointer-events-auto pt-2 text-center">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">러닝 경로 생성</h1>
              <p className="mt-2 text-sm text-white/60">
                거리, 테마, 출발지를 선택하면 Aetheria가 러닝 아트 경로를 설계합니다.
              </p>
            </div>

            <section className="pointer-events-auto mx-auto w-full max-w-6xl px-1 sm:px-2">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="relative space-y-2">
                <Label htmlFor="start_point" className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Step 1. 시작 위치
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <Input
                    id="start_point"
                    aria-label="출발지"
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
                    className="h-12 rounded-full border-white/20 bg-surface-container-high pl-11 text-white shadow-lg shadow-black/20 placeholder:text-white/40 hover:bg-surface-container-highest focus-visible:bg-surface-container-highest"
                  />
                </div>
                {showStartResults && startAddressResults.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/15 bg-surface-container-highest/95 backdrop-blur-md">
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

              <div className="space-y-2">
                <span id="target-distance-label" className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Step 2. 목표 거리
                </span>
                <div role="group" aria-labelledby="target-distance-label" className="grid grid-cols-4 gap-2">
                  {proficiencyOptions.map((option) => {
                    const isSelected = formData.proficiency === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            proficiency: prev.proficiency === option.value ? "" : option.value,
                          }))
                        }
                        className={`h-12 rounded-full border text-sm font-black transition-all ${
                          isSelected
                            ? "border-white bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.22)]"
                            : "border-white/20 bg-surface-container-high text-white shadow-lg shadow-black/15 hover:border-white/35 hover:bg-surface-container-highest"
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme" className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Step 3. 테마 및 형태
                </Label>
                <Input
                  id="theme"
                  aria-label="테마"
                  placeholder="하트, 별, 나비..."
                  value={formData.theme}
                  onChange={(event) => setFormData((prev) => ({ ...prev, theme: event.target.value }))}
                  className="h-12 rounded-full border-white/20 bg-surface-container-high text-white shadow-lg shadow-black/20 placeholder:text-white/40 hover:bg-surface-container-highest focus-visible:bg-surface-container-highest"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="h-14 w-full rounded-full bg-white px-8 text-base font-black text-black hover:bg-white/90 md:w-auto md:min-w-[300px]"
              >
                {isLoading ? "생성 요청 중..." : "작품 생성"}
              </Button>
            </div>
          </section>
          </div>
        </main>
      </div>
    </div>
  )
}
