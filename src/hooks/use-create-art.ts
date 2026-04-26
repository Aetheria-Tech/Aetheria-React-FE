import { useCallback, useState } from "react"
import { useToast } from "@/context/toast-context"
import {
  createRunningArtTask,
  upsertTrackedGenerationTask,
} from "@/services/generation-service"
import type { CreateRunningArtTaskRequest, CreateRunningArtTaskResponse } from "@/types/generation"

interface CreateArtState {
  data: CreateRunningArtTaskResponse | null
  isLoading: boolean
  error: string | null
}

export function useCreateArt() {
  const { notify } = useToast()
  const [state, setState] = useState<CreateArtState>({
    data: null,
    isLoading: false,
    error: null,
  })

  const createArt = useCallback(async (payload: CreateRunningArtTaskRequest) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const data = await createRunningArtTask(payload)
      upsertTrackedGenerationTask({
        taskId: data.taskId,
        startPosition: payload.startPosition,
        shape: payload.shape,
        proficiency: payload.proficiency,
        createdAt: new Date().toISOString(),
        status: "PENDING",
        resultArtId: null,
        errorMessage: null,
      })
      setState((prev) => ({ ...prev, data }))
      return data
    } catch (error) {
      setState((prev) => ({ ...prev, error: "작품 생성에 실패했습니다" }))
      notify("작품 생성에 실패했습니다. 다시 시도해 주세요.", "error")
      throw error
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [notify])

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    createArt,
  }
}
