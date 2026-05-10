import { screen } from "@testing-library/react"
import HomePage from "@/pages/HomePage"
import { renderWithProviders } from "@/test/test-utils"

jest.mock("@/lib/runtime", () => ({
  isDevEnvironment: jest.fn(() => false),
}))

describe("UI snapshots", () => {
  it("matches the home page layout", () => {
    const { container } = renderWithProviders(<HomePage />)
    expect(container).toMatchSnapshot()
    expect(screen.getAllByRole("heading")[0]).toHaveClass("md:text-7xl")
  })
})
