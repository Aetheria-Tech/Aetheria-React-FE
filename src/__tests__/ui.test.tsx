import { screen } from "@testing-library/react"
import HomePage from "@/pages/HomePage"
import { renderWithProviders } from "@/test/test-utils"

describe("UI snapshots", () => {
  it("matches the home page layout", () => {
    const { container } = renderWithProviders(<HomePage />)
    expect(container).toMatchSnapshot()
    expect(screen.getByRole("heading", { name: /러닝 경로/i })).toHaveClass("md:text-7xl")
  })
})
