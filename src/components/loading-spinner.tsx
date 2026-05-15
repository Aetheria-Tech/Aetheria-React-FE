export function LoadingSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-white" />
        </div>
        <p className="text-white/70 text-sm animate-pulse">로딩 중...</p>
      </div>
    </div>
  )
}
