import { useMemo } from "react"
import { parseRouteCoordinates } from "@/lib/polyline"

interface RouteThumbnailProps {
  gpxData?: string | null
  title: string
}

const VIEWBOX_SIZE = 100
const PADDING = 12

export default function RouteThumbnail({ gpxData, title }: RouteThumbnailProps) {
  const preview = useMemo(() => buildPreview(gpxData), [gpxData])

  if (!preview) {
    return (
      <div
        data-testid="route-thumbnail"
        className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25),_transparent_55%),linear-gradient(180deg,_#111827,_#020617)]"
      >
        <span className="text-xs uppercase tracking-[0.35em] text-white/35">No Route</span>
      </div>
    )
  }

  return (
    <div
      data-testid="route-thumbnail"
      data-point-count={preview.pointCount}
      className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25),_transparent_55%),linear-gradient(180deg,_#111827,_#020617)]"
    >
      <svg viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`} className="h-full w-full" aria-label={`${title} 경로 미리보기`}>
        <defs>
          <filter id="route-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.6" result="blurred" />
            <feMerge>
              <feMergeNode in="blurred" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill="transparent" />
        <path
          d={preview.path}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d={preview.path}
          stroke="#f8fafc"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.25"
          filter="url(#route-glow)"
        />
        <path
          d={preview.path}
          stroke="#a855f7"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx={preview.start[0]} cy={preview.start[1]} r="3.2" fill="#22c55e" stroke="#ffffff" strokeWidth="1.2" />
        <circle cx={preview.end[0]} cy={preview.end[1]} r="3.2" fill="#ef4444" stroke="#ffffff" strokeWidth="1.2" />
      </svg>
    </div>
  )
}

function buildPreview(gpxData?: string | null) {
  const routeData = gpxData?.trim()
  if (!routeData) {
    return null
  }

  const coordinates = parseRouteCoordinates(routeData)
  if (coordinates.length < 2) {
    return null
  }

  const latitudes = coordinates.map(([latitude]) => latitude)
  const longitudes = coordinates.map(([, longitude]) => longitude)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)

  const width = Math.max(maxLongitude - minLongitude, 0.00001)
  const height = Math.max(maxLatitude - minLatitude, 0.00001)
  const availableSize = VIEWBOX_SIZE - PADDING * 2
  const scale = Math.min(availableSize / width, availableSize / height)
  const scaledWidth = width * scale
  const scaledHeight = height * scale
  const offsetX = (VIEWBOX_SIZE - scaledWidth) / 2
  const offsetY = (VIEWBOX_SIZE - scaledHeight) / 2

  const points = coordinates.map(([latitude, longitude]) => {
    const x = offsetX + (longitude - minLongitude) * scale
    const y = offsetY + (maxLatitude - latitude) * scale
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const
  })

  return {
    path: points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" "),
    start: points[0],
    end: points[points.length - 1],
    pointCount: points.length,
  }
}
