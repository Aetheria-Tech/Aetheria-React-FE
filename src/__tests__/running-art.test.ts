import { toArtFromRunningArt } from "@/lib/running-art"

describe("toArtFromRunningArt", () => {
  it("maps optional running art metadata to Art fields", () => {
    const result = toArtFromRunningArt({
      id: 1,
      title: "테스트 작품",
      content: "설명",
      shape: "HEART",
      proficiency: "BEGINNER",
      gpx: "mock-gpx",
      userId: 10,
      image_url: "/image.png",
      distance_km: "8.5",
      is_public: true,
      created_at: "2026-02-11T10:00:00.000Z",
    })

    expect(result.imageUrl).toBe("/image.png")
    expect(result.distanceKm).toBe(8.5)
    expect(result.isPublic).toBe(true)
    expect(result.createdAt).toBe("2026-02-11T10:00:00.000Z")
  })

  it("uses safe fallback values when metadata is missing", () => {
    const result = toArtFromRunningArt({
      id: 2,
      title: "기본값 작품",
      content: "",
      shape: "STAR",
      proficiency: "BEGINNER",
      gpx: "",
      userId: 11,
    })

    expect(result.imageUrl).toBe("/placeholder.svg")
    expect(result.distanceKm).toBe(0)
    expect(result.isPublic).toBe(false)
    expect(result.createdAt).toBe("")
  })
})
