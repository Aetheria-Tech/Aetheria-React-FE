import { env } from "@/services/env"

const trimTrailingSlash = (value: string) => value.trim().replace(/\/+$/, "")

const normalizeApiPath = (baseUrl: string, path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const [, firstPathSegment = ""] = normalizedPath.split("/")

  if (firstPathSegment && baseUrl.endsWith(`/${firstPathSegment}`)) {
    return normalizedPath.slice(firstPathSegment.length + 1)
  }

  return normalizedPath
}

export const buildApiUrl = (path: string, baseUrl = env.apiBaseUrl) => {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl)
  return normalizedBaseUrl ? `${normalizedBaseUrl}${normalizeApiPath(normalizedBaseUrl, path)}` : path
}
