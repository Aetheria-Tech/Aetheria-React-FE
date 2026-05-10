import { useCallback, useState } from "react"
import type { Art } from "@/types/art"
import { getRunningArtDetail } from "@/services/art-service"
import { useToast } from "@/context/toast-context"
import { toArtFromRunningArt } from "@/lib/running-art"

export function useArtDetail() {
  const { notify } = useToast()
  const [art, setArt] = useState<Art | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadArt = useCallback(
    async (artId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getRunningArtDetail(artId)
        const mapped = toArtFromRunningArt(data)
        setArt(mapped)
        return mapped
      } catch (err) {
        setError("작품을 불러오는 데 실패했습니다")
        notify("작품을 불러오는 데 실패했습니다.", "error")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [notify],
  )

  return {
    art,
    isLoading,
    error,
    loadArt,
    setArt,
  }
}
