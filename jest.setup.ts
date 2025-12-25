import "@testing-library/jest-dom"
import { TextDecoder, TextEncoder } from "util"

jest.mock("@/components/shooting-stars", () => ({
  __esModule: true,
  default: () => null,
}))

if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder
}

if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder
}

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
;(global as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  const [message] = args
  if (typeof message === "string" && message.includes("not configured to support act")) {
    return
  }
  originalConsoleError(...args)
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

window.scrollTo = () => undefined