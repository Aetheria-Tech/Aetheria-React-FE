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
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/running-arts/me", {
      params: {
        page: 0,
        size: 100,
        sort: "createdAt,desc",
      },
    })
  })

  it("loads every backend page when the running art list is paginated", async () => {
    ;(apiClient.get as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            content: [
              {
                id: 2,
                title: "second",
                content: "route",
                shape: "DOG",
                proficiency: "BEGINNER",
                gpx: "encoded-2",
                userId: 10,
              },
            ],
            last: false,
            totalPages: 2,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            content: [
              {
                id: 1,
                title: "first",
                content: "route",
                shape: "HEART",
                proficiency: "BEGINNER",
                gpx: "encoded-1",
                userId: 10,
              },
            ],
            last: true,
            totalPages: 2,
          },
        },
      })

    await expect(getMyRunningArts()).resolves.toEqual([
      {
        id: 2,
        title: "second",
        content: "route",
        shape: "DOG",
        proficiency: "BEGINNER",
        gpx: "encoded-2",
        userId: 10,
      },
      {
        id: 1,
        title: "first",
        content: "route",
        shape: "HEART",
        proficiency: "BEGINNER",
        gpx: "encoded-1",
        userId: 10,
      },
    ])
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/api/v1/running-arts/me", {
      params: {
        page: 0,
        size: 100,
        sort: "createdAt,desc",
      },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/api/v1/running-arts/me", {
      params: {
        page: 1,
        size: 100,
        sort: "createdAt,desc",
      },
    })
  })
})
