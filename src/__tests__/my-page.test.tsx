import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"
import MyPage from "@/pages/MyPage"
import MyPageDetail from "@/pages/MyPageDetail"
import { deleteRunningArt, getMyRunningArts, getRunningArtDetail, patchRunningArt } from "@/services/art-service"
import { authStorage } from "@/services/auth-storage"
import { updateMyProfile, withdrawMe } from "@/services/auth-service"
import { isDevEnvironment } from "@/lib/runtime"
import { mockAuthPayload, renderWithProviders } from "@/test/test-utils"

jest.mock("@/services/auth-service", () => ({
  updateMyProfile: jest.fn(),
  withdrawMe: jest.fn(),
}))

jest.mock("@/lib/runtime", () => ({
  isDevEnvironment: jest.fn(() => false),
}))

jest.mock("@/services/art-service", () => ({
  createArt: jest.fn(),
  saveArt: jest.fn(),
  fetchMyArts: jest.fn(),
  deleteArt: jest.fn(),
  fetchArtById: jest.fn(),
  updateShareStatus: jest.fn(),
  fetchGalleryArts: jest.fn(),
  getMyRunningArts: jest.fn(),
  getRunningArtDetail: jest.fn(),
  deleteRunningArt: jest.fn(),
  patchRunningArt: jest.fn(),
}))

const detailAuth = {
  user: {
    id: "10",
    name: "Owner",
    email: "owner@example.com",
  },
  tokens: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
  },
}

const detailArt = {
  id: 1,
  title: "Morning run",
  content: "테스트 러닝 아트",
  shape: "HEART",
  proficiency: "BEGINNER",
  gpx: "_p~iF~ps|U",
  userId: 10,
}

describe("MyPage", () => {
  beforeEach(() => {
    ;(updateMyProfile as jest.Mock).mockReset()
    ;(withdrawMe as jest.Mock).mockReset()
    ;(isDevEnvironment as jest.Mock).mockReturnValue(false)
    ;(getMyRunningArts as jest.Mock).mockReset()
    ;(getRunningArtDetail as jest.Mock).mockReset()
    ;(deleteRunningArt as jest.Mock).mockReset()
    ;(patchRunningArt as jest.Mock).mockReset()
  })

  it("shows logout button for authenticated users", async () => {
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByRole("button", { name: "로그아웃" })).toBeInTheDocument()
  })

  it("hides logout button for unauthenticated users in non-dev mode", async () => {
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])

    renderWithProviders(<MyPage />, { auth: null })

    await screen.findByText("아직 작품이 없습니다.")
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument()
  })

  it("shows only login button for unauthenticated users", async () => {
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])

    renderWithProviders(<MyPage />, { auth: null })

    expect(await screen.findByRole("button", { name: "로그인" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument()
  })

  it("logs out and navigates home when clicking logout button", async () => {
    const user = userEvent.setup()
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])
    const clearSpy = jest.spyOn(authStorage, "clear")

    renderWithProviders(
      <Routes>
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/" element={<div>홈</div>} />
      </Routes>,
      { route: "/mypage", auth: mockAuthPayload },
    )

    await user.click(await screen.findByRole("button", { name: "로그아웃" }))

    await waitFor(() => expect(clearSpy).toHaveBeenCalled())
    expect(await screen.findByText("홈")).toBeInTheDocument()
    clearSpy.mockRestore()
  })

  it("saves edited profile via patch and updates the rendered profile", async () => {
    const user = userEvent.setup()
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])
    ;(updateMyProfile as jest.Mock).mockResolvedValue({
      id: "user@example.com",
      name: "수정된 닉네임",
      email: "user@example.com",
      statusMessage: "오늘도 달립니다.",
    })

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    await user.click(await screen.findByRole("button", { name: "수정" }))
    const nameInput = screen.getByRole("textbox", { name: "닉네임 입력" })
    await user.clear(nameInput)
    await user.type(nameInput, "수정된 닉네임")
    const statusTextarea = screen.getByRole("textbox", { name: "상태 메시지 입력" })
    await user.type(statusTextarea, "오늘도 달립니다.")
    await user.click(screen.getByRole("button", { name: "저장" }))

    await waitFor(() =>
      expect(updateMyProfile).toHaveBeenCalledWith({
        nickname: "수정된 닉네임",
        statusMessage: "오늘도 달립니다.",
      }),
    )
    expect(await screen.findByText("프로필이 저장되었습니다.")).toBeInTheDocument()
    expect(screen.getByText("수정된 닉네임")).toBeInTheDocument()
    expect(screen.getByText("오늘도 달립니다.")).toBeInTheDocument()
  })

  it("keeps edit mode when profile save fails", async () => {
    const user = userEvent.setup()
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])
    ;(updateMyProfile as jest.Mock).mockRejectedValue(new Error("save-fail"))

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    await user.click(await screen.findByRole("button", { name: "수정" }))
    const nameInput = screen.getByRole("textbox", { name: "닉네임 입력" })
    await user.clear(nameInput)
    await user.type(nameInput, "실패한 닉네임")
    await user.click(screen.getByRole("button", { name: "저장" }))

    expect(await screen.findByText("프로필 저장에 실패했습니다. 입력값을 확인한 뒤 다시 시도해주세요.")).toBeInTheDocument()
    expect(screen.getByDisplayValue("실패한 닉네임")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument()
  })

  it("loads and displays artworks", async () => {
    const arts = [
      {
        id: 1,
        title: "Morning run",
        content: "테스트 러닝 아트",
        shape: "HEART",
        proficiency: "BEGINNER",
        gpx: "_p~iF~ps|U",
        userId: 10,
      },
    ]

    ;(getMyRunningArts as jest.Mock).mockResolvedValue(arts)

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
  })

  it("shows empty state when there are no artworks", async () => {
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("아직 작품이 없습니다.")).toBeInTheDocument()
  })

  it("shows toast when loading artworks fails", async () => {
    ;(getMyRunningArts as jest.Mock).mockRejectedValue(new Error("fail"))

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("작품을 불러오는 데 실패했습니다.")).toBeInTheDocument()
  })

  it("does not render delete button on MyPage list", async () => {
    const arts = [
      {
        id: 1,
        title: "Morning run",
        content: "테스트 러닝 아트",
        shape: "HEART",
        proficiency: "BEGINNER",
        gpx: "_p~iF~ps|U",
        userId: 10,
      },
    ]

    ;(getMyRunningArts as jest.Mock).mockResolvedValue(arts)
    ;(deleteRunningArt as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /삭제/i })).not.toBeInTheDocument()
  })

  it("navigates to detail view when clicking an artwork card", async () => {
    const user = userEvent.setup()
    const arts = [
      {
        id: 1,
        title: "Morning run",
        content: "테스트 러닝 아트",
        shape: "HEART",
        proficiency: "BEGINNER",
        gpx: "_p~iF~ps|U",
        userId: 10,
      },
    ]

    ;(getMyRunningArts as jest.Mock).mockResolvedValue(arts)
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(arts[0])

    renderWithProviders(
      <Routes>
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage", auth: mockAuthPayload },
    )

    const link = await screen.findByRole("link", { name: "Morning run" })
    await user.click(link)

    expect(await screen.findByText("작품 상세")).toBeInTheDocument()
    expect(await screen.findByText("Morning run")).toBeInTheDocument()
  })

  it("deletes artwork in detail page and navigates to MyPage on success", async () => {
    const user = userEvent.setup()
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(detailArt)
    ;(deleteRunningArt as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
        <Route path="/mypage" element={<div>마이페이지 목록</div>} />
      </Routes>,
      { route: "/mypage/1", auth: detailAuth },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "삭제" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "삭제" }))

    await waitFor(() => expect(deleteRunningArt).toHaveBeenCalledWith("1"))
    expect(await screen.findByText("작품이 삭제되었습니다.")).toBeInTheDocument()
    expect(await screen.findByText("마이페이지 목록")).toBeInTheDocument()
  })

  it("shows error toast and stays on detail page when delete fails", async () => {
    const user = userEvent.setup()
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(detailArt)
    ;(deleteRunningArt as jest.Mock).mockRejectedValue(new Error("fail"))

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
        <Route path="/mypage" element={<div>마이페이지 목록</div>} />
      </Routes>,
      { route: "/mypage/1", auth: detailAuth },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "삭제" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "삭제" }))

    expect(await screen.findByText("작품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.")).toBeInTheDocument()
    expect(screen.queryByText("마이페이지 목록")).not.toBeInTheDocument()
  })

  it("closes delete confirm modal without calling API when canceled", async () => {
    const user = userEvent.setup()
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(detailArt)
    ;(deleteRunningArt as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage/1", auth: detailAuth },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "삭제" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "취소" }))

    expect(deleteRunningArt).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("disables delete button when current user is not the owner", async () => {
    const auth = {
      user: {
        id: "99",
        name: "Viewer",
        email: "viewer@example.com",
      },
      tokens: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
      },
    }
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(detailArt)

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage/1", auth },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "삭제" })).toBeDisabled()
  })

  it("shows textarea when clicking description edit button in detail page", async () => {
    const user = userEvent.setup()
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(detailArt)

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage/1", auth: detailAuth },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "설명 수정" }))

    expect(screen.getByRole("textbox", { name: "설명 입력" })).toBeInTheDocument()
  })

  it("saves edited description via patch and returns to view mode on success", async () => {
    const user = userEvent.setup()
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(detailArt)
    ;(patchRunningArt as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage/1", auth: detailAuth },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "설명 수정" }))

    const textarea = screen.getByRole("textbox", { name: "설명 입력" })
    await user.clear(textarea)
    await user.type(textarea, "수정된 설명")
    await user.click(screen.getByRole("button", { name: "설명 저장" }))

    await waitFor(() =>
      expect(patchRunningArt).toHaveBeenCalledWith("1", {
        title: "Morning run",
        content: "수정된 설명",
      }),
    )
    expect(await screen.findByText("설명이 저장되었습니다.")).toBeInTheDocument()
    expect(screen.getByText("수정된 설명")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "설명 입력" })).not.toBeInTheDocument()
  })

  it("keeps edit mode and input value when description save fails", async () => {
    const user = userEvent.setup()
    ;(getRunningArtDetail as jest.Mock).mockResolvedValue(detailArt)
    ;(patchRunningArt as jest.Mock).mockRejectedValue(new Error("save-fail"))

    renderWithProviders(
      <Routes>
        <Route path="/mypage/:id" element={<MyPageDetail />} />
      </Routes>,
      { route: "/mypage/1", auth: detailAuth },
    )

    expect(await screen.findByText("Morning run")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "설명 수정" }))

    const textarea = screen.getByRole("textbox", { name: "설명 입력" })
    await user.clear(textarea)
    await user.type(textarea, "저장 실패 후 유지")
    await user.click(screen.getByRole("button", { name: "설명 저장" }))

    expect(await screen.findByText("설명 저장에 실패했습니다. 잠시 후 다시 시도해주세요.")).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "설명 입력" })).toHaveValue("저장 실패 후 유지")
    expect(screen.getByRole("button", { name: "설명 저장" })).toBeInTheDocument()
  })

  it("renders withdraw button and opens modal", async () => {
    const user = userEvent.setup()
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    await user.click(await screen.findByRole("button", { name: "수정" }))
    const button = await screen.findByRole("button", { name: "회원탈퇴" })
    await user.click(button)

    expect(screen.getByRole("heading", { name: "회원탈퇴" })).toBeInTheDocument()
    expect(
      screen.getByText("정말 회원탈퇴를 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다."),
    ).toBeInTheDocument()
  })

  it("closes withdraw modal on cancel", async () => {
    const user = userEvent.setup()
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    await user.click(await screen.findByRole("button", { name: "수정" }))
    await user.click(await screen.findByRole("button", { name: "회원탈퇴" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("button", { name: "취소" }))

    expect(
      screen.queryByText("정말 회원탈퇴를 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다."),
    ).not.toBeInTheDocument()
  })

  it("withdraws account, clears auth, and navigates home on success", async () => {
    const user = userEvent.setup()
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])
    ;(withdrawMe as jest.Mock).mockResolvedValue(undefined)
    const clearSpy = jest.spyOn(authStorage, "clear")

    renderWithProviders(
      <Routes>
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/" element={<div>홈</div>} />
      </Routes>,
      { route: "/mypage", auth: mockAuthPayload },
    )

    await user.click(await screen.findByRole("button", { name: "수정" }))
    await user.click(await screen.findByRole("button", { name: "회원탈퇴" }))
    const dialog = await screen.findByRole("dialog")
    await act(async () => {
      await user.click(within(dialog).getByRole("button", { name: "회원탈퇴" }))
    })

    await waitFor(() => expect(withdrawMe).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(clearSpy).toHaveBeenCalled())
    expect(await screen.findByText("홈")).toBeInTheDocument()
    clearSpy.mockRestore()
  })

  it("shows toast and does not logout on withdraw failure", async () => {
    const user = userEvent.setup()
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])
    ;(withdrawMe as jest.Mock).mockRejectedValue(new Error("fail"))
    const clearSpy = jest.spyOn(authStorage, "clear")

    renderWithProviders(
      <Routes>
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/" element={<div>홈</div>} />
      </Routes>,
      { route: "/mypage", auth: mockAuthPayload },
    )

    await user.click(await screen.findByRole("button", { name: "수정" }))
    await user.click(await screen.findByRole("button", { name: "회원탈퇴" }))
    const dialog = await screen.findByRole("dialog")
    await act(async () => {
      await user.click(within(dialog).getByRole("button", { name: "회원탈퇴" }))
    })

    expect(
      await screen.findByText("회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요."),
    ).toBeInTheDocument()
    expect(clearSpy).not.toHaveBeenCalled()
    expect(screen.queryByText("홈")).not.toBeInTheDocument()
    clearSpy.mockRestore()
  })

  it("prevents duplicate withdraw requests", async () => {
    const user = userEvent.setup()
    ;(getMyRunningArts as jest.Mock).mockResolvedValue([])
    let resolvePromise: (() => void) | undefined
    const pending = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })
    ;(withdrawMe as jest.Mock).mockReturnValue(pending)

    renderWithProviders(<MyPage />, { auth: mockAuthPayload })

    await user.click(await screen.findByRole("button", { name: "수정" }))
    await user.click(await screen.findByRole("button", { name: "회원탈퇴" }))
    const dialog = await screen.findByRole("dialog")
    const confirm = within(dialog).getByRole("button", { name: "회원탈퇴" })
    await act(async () => {
      await user.click(confirm)
      await user.click(confirm)
    })

    expect(withdrawMe).toHaveBeenCalledTimes(1)
    resolvePromise?.()
  })
})
