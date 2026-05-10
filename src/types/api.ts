export type RestApiError = {
  code?: string
  message?: string
  details?: unknown
}

export type RestApiResponse<T> = {
  success: boolean
  data?: T
  error?: RestApiError | null
}

export const isRestApiResponse = (value: unknown): value is RestApiResponse<unknown> => {
  if (!value || typeof value !== "object") return false
  if (!("success" in value)) return false
  return typeof (value as { success?: unknown }).success === "boolean"
}

export const unwrapApiResponse = <T>(value: unknown): T => {
  if (!isRestApiResponse(value)) {
    throw new Error("Invalid API response")
  }

  if (!value.success) {
    const message = value.error?.message ?? "API request failed"
    throw new Error(message)
  }

  if (!("data" in value)) {
    throw new Error("API response missing data")
  }

  return value.data as T
}

export const unwrapVoidResponse = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return
  }

  if (!isRestApiResponse(value)) {
    throw new Error("Invalid API response")
  }

  if (!value.success) {
    const message = value.error?.message ?? "API request failed"
    throw new Error(message)
  }
}
