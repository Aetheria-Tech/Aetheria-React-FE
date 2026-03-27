import { getApiErrorMessage, isRestApiResponse, unwrapApiResponse, unwrapVoidResponse } from "@/types/api"

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

  it("accepts empty responses for void endpoints", () => {
    expect(() => unwrapVoidResponse(undefined)).not.toThrow()
    expect(() => unwrapVoidResponse("")).not.toThrow()
  })

  it("extracts backend error messages from nested axios-like responses", () => {
    const error = {
      message: "Request failed with status code 502",
      response: {
        data: {
          success: false,
          error: {
            message: "카카오 연결 해제에 실패했습니다.",
          },
        },
      },
    }

    expect(getApiErrorMessage(error, "기본 오류")).toBe("카카오 연결 해제에 실패했습니다.")
  })
})
