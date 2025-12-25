export {}

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean
      init: (key: string) => void
      Auth: {
        login: (options: {
          success: (authObj: { access_token?: string; accessToken?: string }) => void
          fail: (error: unknown) => void
        }) => void
        logout: (callback: () => void) => void
      }
    }
    daum?: {
      Postcode: new (options: { oncomplete: (data: { address: string }) => void }) => { open: () => void }
    }
  }
}