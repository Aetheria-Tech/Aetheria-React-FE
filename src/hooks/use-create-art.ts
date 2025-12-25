import { useCallback, useState } from "react"
import type { Art, CreateArtPayload, CreateArtResponse } from "@/types/art"
import { createArt as createArtRequest, saveArt as saveArtRequest } from "@/services/art-service"
import { useToast } from "@/context/toast-context"

interface CreateArtState {
  data: CreateArtResponse | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  savedArt: Art | null
}

export function useCreateArt() {
  const { notify } = useToast()
  const [state, setState] = useState<CreateArtState>({
    data: null,
    isLoading: false,
    isSaving: false,
    error: null,
    savedArt: null,
  })

  const createArt = useCallback(async (payload: CreateArtPayload) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const data = await createArtRequest(payload)
      setState((prev) => ({ ...prev, data, savedArt: data.art }))
      return data
    } catch (error) {
      setState((prev) => ({ ...prev, error: "작품 생성에 실패했습니다" }))
      notify("작품 생성에 실패했습니다. 다시 시도해 주세요.", "error")
      throw error
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [notify])

  const saveArt = useCallback(async () => {
    if (!state.data?.art.id) return null
    setState((prev) => ({ ...prev, isSaving: true, error: null }))
    try {
      const saved = await saveArtRequest(state.data.art.id)
      setState((prev) => ({ ...prev, savedArt: saved }))
      notify("작품이 저장되었습니다.", "success")
      return saved
    } catch (error) {
      setState((prev) => ({ ...prev, error: "작품 저장에 실패했습니다" }))
      notify("작품 저장에 실패했습니다.", "error")
      throw error
    } finally {
      setState((prev) => ({ ...prev, isSaving: false }))
    }
  }, [notify, state.data?.art.id])

  return {
    data: state.data,
    savedArt: state.savedArt,
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,
    createArt,
    saveArt,
  }
}
