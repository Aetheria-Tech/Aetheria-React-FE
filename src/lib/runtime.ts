const isLocalHost = () => {
  if (typeof window === "undefined") return false
  const host = window.location.hostname
  return host === "localhost" || host === "127.0.0.1"
}

export function isDevEnvironment(): boolean {
  const isViteDev = Boolean(import.meta.env?.DEV)
  const isLocalBypass = import.meta.env?.VITE_DEV_BYPASS_AUTH === "true" && isLocalHost()

  // 개발/시연용 우회: 로컬에서만 관리 기능(삭제/공유/로그아웃 버튼 등) 확인 가능.
  // main 배포 전에는 `.env*`의 VITE_DEV_BYPASS_AUTH를 반드시 false(또는 제거)로 유지하세요.
  return isViteDev || isLocalBypass
}

