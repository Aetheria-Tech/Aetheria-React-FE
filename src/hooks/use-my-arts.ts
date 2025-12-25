import { useCallback, useState } from "react"
import type { Art } from "@/types/art"
import { deleteArt as deleteArtRequest, fetchMyArts } from "@/services/art-service"
import { useToast } from "@/context/toast-context"

export function useMyArts() {
  const { notify } = useToast()
  const [arts, setArts] = useState<Art[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadArts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchMyArts()
      setArts(data)
      return data
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
        await deleteArtRequest(artId)
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
