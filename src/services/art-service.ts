import { apiClient } from "@/services/api-client"
import type { Art, CreateArtPayload, CreateArtResponse } from "@/types/art"

export async function createArt(payload: CreateArtPayload): Promise<CreateArtResponse> {
  // Keep create + AI generation in one request for a single user action.
  const response = await apiClient.post<CreateArtResponse>("/arts", payload)
  return response.data
}

export async function saveArt(artId: string): Promise<Art> {
  const response = await apiClient.post<Art>(`/arts/${artId}/save`)
  return response.data
}

export async function fetchMyArts(): Promise<Art[]> {
  const response = await apiClient.get<Art[]>("/arts/mine")
  return response.data
}

export async function fetchArtById(artId: string): Promise<Art> {
  const response = await apiClient.get<Art>(`/arts/${artId}`)
  return response.data
}

export async function deleteArt(artId: string): Promise<void> {
  await apiClient.delete(`/arts/${artId}`)
}

export async function updateShareStatus(artId: string, isPublic: boolean): Promise<Art> {
  const response = await apiClient.patch<Art>(`/arts/${artId}/share`, { isPublic })
  return response.data
}

export async function fetchGalleryArts(): Promise<Art[]> {
  const response = await apiClient.get<Art[]>("/arts")
  return response.data
}