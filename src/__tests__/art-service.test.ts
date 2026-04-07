import { getMyRunningArts } from "@/services/art-service"
import { apiClient } from "@/services/api-client"

jest.mock("@/services/api-client", () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

jest.mock("@/services/env", () => ({
  env: {
    useMockApi: "false",
  },
}))

describe("getMyRunningArts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("unwraps paged running art responses from the backend", async () => {
    ;(apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          content: [
            {
              id: 1,
              title: "sample",
              content: "route",
              shape: "HEART",
              proficiency: "BEGINNER",
              gpx: "encoded",
              userId: 10,
            },
          ],
        },
      },
    })

    await expect(getMyRunningArts()).resolves.toEqual([
      {
        id: 1,
        title: "sample",
        content: "route",
        shape: "HEART",
        proficiency: "BEGINNER",
        gpx: "encoded",
        userId: 10,
      },
    ])
  })
})
