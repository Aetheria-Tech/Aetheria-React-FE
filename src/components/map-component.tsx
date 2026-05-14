"use client"

import { useEffect, useRef, useState } from "react"
import { Navigation } from "lucide-react"
import * as L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-gpx"
import { decodePolyline, isXmlRouteData } from "@/lib/polyline"
import { coordsToAddress } from "@/services/kakao-service"

interface MapComponentProps {
  center: [number, number]
  startCoords?: [number, number] | null
  endCoords?: [number, number] | null
  gpxData?: string | null
  onLocationFound: (coords: [number, number]) => void
  onMapClick?: (coords: [number, number]) => void
  showLocationButton?: boolean
  displayOnly?: boolean
  routeColor?: string
}

interface MapInstance {
  map: L.Map
  startMarker: L.Marker | null
  endMarker: L.Marker | null
  currentLocationMarker: L.Marker | null
  routeLayer: L.Layer | null
}

type GpxLayer = L.Layer & {
  on(
    event: "loaded",
    handler: (event: { target: { getBounds: () => L.LatLngBounds } }) => void,
  ): GpxLayer
}

interface GpxOptions {
  async?: boolean
  marker_options?: {
    startIconUrl?: string
    endIconUrl?: string
    shadowUrl?: string
  }
  polyline_options?: {
    color?: string
    weight?: number
    opacity?: number
  }
}

type LeafletWithGpx = typeof L & { GPX: new (gpx: string, options?: GpxOptions) => GpxLayer }

export default function MapComponent({
  center,
  startCoords,
  endCoords,
  gpxData,
  onLocationFound,
  onMapClick,
  showLocationButton = true,
  displayOnly = false,
  routeColor = "var(--primary)",
}: MapComponentProps) {
  const centerLat = center[0]
  const centerLng = center[1]
  const mapRef = useRef<MapInstance | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
  const [currentAddress, setCurrentAddress] = useState<string>("")
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      zoomControl: !displayOnly,
      dragging: !displayOnly,
      scrollWheelZoom: !displayOnly,
      doubleClickZoom: !displayOnly,
      boxZoom: !displayOnly,
      keyboard: !displayOnly,
      touchZoom: !displayOnly,
    }).setView([centerLat, centerLng], 13)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    mapRef.current = {
      map,
      startMarker: null,
      endMarker: null,
      currentLocationMarker: null,
      routeLayer: null,
    }

    setIsLoading(false)

    requestAnimationFrame(() => {
      map.invalidateSize()
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [centerLat, centerLng, displayOnly])

  useEffect(() => {
    if (mapRef.current?.map) {
      mapRef.current.map.setView([centerLat, centerLng], 13)
    }
  }, [centerLat, centerLng])

  useEffect(() => {
    if (!mapRef.current?.map || !onMapClick) return

    const { map } = mapRef.current
    const handleClick = (event: L.LeafletMouseEvent) => {
      onMapClick([event.latlng.lat, event.latlng.lng])
    }

    map.on("click", handleClick)
    return () => {
      map.off("click", handleClick)
    }
  }, [onMapClick])

  useEffect(() => {
    if (isLoading || !mapRef.current) return

    const { map, startMarker } = mapRef.current

    if (startMarker) {
      map.removeLayer(startMarker)
    }

    if (startCoords) {
      const greenIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      const marker = L.marker(startCoords, { icon: greenIcon }).addTo(map).bindPopup("출발")
      mapRef.current.startMarker = marker
    }
  }, [startCoords, isLoading])

  useEffect(() => {
    if (isLoading || !mapRef.current) return

    const { map, endMarker } = mapRef.current

    if (endMarker) {
      map.removeLayer(endMarker)
    }

    if (endCoords) {
      const redIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      const marker = L.marker(endCoords, { icon: redIcon }).addTo(map).bindPopup("도착")
      mapRef.current.endMarker = marker
    }
  }, [endCoords, isLoading])

  useEffect(() => {
    if (isLoading || !mapRef.current) return

    const { map, routeLayer } = mapRef.current

    if (routeLayer) {
      map.removeLayer(routeLayer)
      mapRef.current.routeLayer = null
    }

    const routeData = gpxData?.trim()

    if (!routeData) return

    if (isXmlRouteData(routeData)) {
      const leafletWithGpx = L as LeafletWithGpx
      const newGpxLayer = new leafletWithGpx.GPX(routeData, {
        async: true,
        marker_options: {
          startIconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          endIconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        },
        polyline_options: {
          color: routeColor,
          weight: 4,
          opacity: 0.8,
        },
      })

      newGpxLayer.on("loaded", (event: { target: { getBounds: () => L.LatLngBounds } }) => {
        requestAnimationFrame(() => {
          map.invalidateSize()
          map.fitBounds(event.target.getBounds())
        })
      })

      newGpxLayer.addTo(map)
      mapRef.current.routeLayer = newGpxLayer
      return
    }

    try {
      const coordinates = decodePolyline(routeData)

      if (coordinates.length < 2) {
        return
      }

      const polyline = L.polyline(coordinates, {
        color: routeColor,
        weight: 6,
        opacity: 0.95,
      })
      const startMarker = L.circleMarker(coordinates[0], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: "#ffffff",
        fillOpacity: 1,
      })
      const endMarker = L.circleMarker(coordinates[coordinates.length - 1], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: "#8e9192",
        fillOpacity: 1,
      })

      const routeGroup = L.featureGroup([polyline, startMarker, endMarker]).addTo(map)
      polyline.bringToFront()
      requestAnimationFrame(() => {
        map.invalidateSize()
        map.fitBounds(routeGroup.getBounds(), { padding: [24, 24] })
      })
      mapRef.current.routeLayer = routeGroup
    } catch (error) {
      console.error("경로 디코딩 실패:", error)
    }
  }, [gpxData, isLoading, routeColor])

  const handleLocationClick = () => {
    if (!mapRef.current?.map) return

    const mapState = mapRef.current
    const { map } = mapState

    map.locate({ setView: true, maxZoom: 16 })

    map.once("locationfound", async (event: L.LocationEvent) => {
      const coords: [number, number] = [event.latlng.lat, event.latlng.lng]
      setCurrentLocation(coords)
      onLocationFound(coords)

      if (mapState.currentLocationMarker) {
        map.removeLayer(mapState.currentLocationMarker)
      }

      const blueIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })

      const marker = L.marker(coords, { icon: blueIcon }).addTo(map)
      mapState.currentLocationMarker = marker

      let addressLabel = `위도: ${coords[0].toFixed(6)}, 경도: ${coords[1].toFixed(6)}`
      try {
        const address = await coordsToAddress(coords[0], coords[1])
        if (address) addressLabel = address
      } catch {
        // Keep fallback coordinates when reverse geocoding is unavailable.
      }
      setCurrentAddress(addressLabel)

      marker
        .bindPopup(
          `<div style="text-align: center;"><strong>현재 위치</strong><br/><span style="font-size: 12px;">${addressLabel}</span></div>`,
        )
        .openPopup()
    })

    map.once("locationerror", (event: L.ErrorEvent) => {
      alert(`위치 정보를 가져오지 못했습니다: ${event.message}`)
    })
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/60">
          <div className="text-white">지도 불러오는 중...</div>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
      {showLocationButton && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <button
            onClick={handleLocationClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="relative rounded-full bg-primary p-3 text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary-container"
            title="내 위치 찾기"
          >
            <Navigation className="w-5 h-5" />
          </button>
          {showTooltip && currentLocation && currentAddress && (
            <div className="absolute bottom-full right-0 mb-2 max-w-xs whitespace-nowrap rounded-lg border border-white/15 bg-surface-container-high px-3 py-2 text-sm text-white shadow-xl backdrop-blur-sm">
              <div className="mb-1 font-semibold text-white">현재 위치</div>
              <div className="max-w-[200px] break-words text-xs text-white/75">{currentAddress}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
