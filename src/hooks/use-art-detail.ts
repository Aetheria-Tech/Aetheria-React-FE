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

  const updateShare = useCallback(
    (artId: string, isPublic: boolean) => {
      if (!art || String(art.id) !== artId) return null
      setError(null)
      // TODO: 백엔드 공유 토글 API가 준비되면 로컬 업데이트 대신 서버 상태를 기준으로 갱신해야 합니다.
      const updated = { ...art, isPublic }
      setArt(updated)
      notify(isPublic ? "작품이 공개로 전환되었습니다." : "작품이 비공개로 전환되었습니다.", "success")
      return updated
    },
    [notify, art],
  )

  return {
    art,
    isLoading,
    error,
    loadArt,
    updateShare,
    setArt,
  }
}
