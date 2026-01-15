import { isRestApiResponse, unwrapApiResponse } from "@/types/api"

describe("api response helpers", () => {
  it("unwraps data on success", () => {
    const payload = unwrapApiResponse<{ id: string }>({ success: true, data: { id: "ok" } })
    expect(payload).toEqual({ id: "ok" })
  })

  it("throws on failure responses", () => {
    expect(() => unwrapApiResponse({ success: false, error: { message: "Denied" } })).toThrow("Denied")
  })

  it("rejects non-contract responses", () => {
    expect(isRestApiResponse({ data: { id: "nope" } })).toBe(false)
    expect(() => unwrapApiResponse({ data: { id: "nope" } })).toThrow("Invalid API response")
  })
})
