import { useCallback, useState } from "react"
import type { Art } from "@/types/art"
import { deleteRunningArt, getMyRunningArts, getRunningArtSample } from "@/services/art-service"
import { useToast } from "@/context/toast-context"
import { toArtFromRunningArt } from "@/lib/running-art"

export function useMyArts() {
  const { notify } = useToast()
  const [arts, setArts] = useState<Art[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadArts = useCallback(async (options?: { includeSample?: boolean }) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getMyRunningArts()
      const mapped = data.map(toArtFromRunningArt)

      if (!options?.includeSample) {
        setArts(mapped)
        return mapped
      }

      try {
        const sample = await getRunningArtSample()
        const combined = [toArtFromRunningArt(sample), ...mapped]
        setArts(combined)
        return combined
      } catch {
        // sample은 보조 데이터이므로 실패해도 실제 사용자 작품 목록은 그대로 노출한다.
        setArts(mapped)
        return mapped
      }
    } catch (err) {
      setError("작품을 불러오는 데 실패했습니다")
      notify("작품을 불러오는 데 실패했습니다.", "error")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [notify])

  const removeArt = useCallback(
    async (artId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const parsedId = Number(artId)
        await deleteRunningArt(Number.isFinite(parsedId) ? parsedId : artId)
        setArts((prev) => prev.filter((art) => art.id !== artId))
        notify("작품이 삭제되었습니다.", "success")
      } catch (err) {
        setError("작품 삭제에 실패했습니다")
        notify("작품 삭제에 실패했습니다.", "error")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [notify],
  )

  return {
    arts,
    isLoading,
    error,
    loadArts,
    removeArt,
    setArts,
  }
}
