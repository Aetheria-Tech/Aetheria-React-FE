import type { ReactNode } from "react"
import ShootingStars from "@/components/shooting-stars"

interface AppBackgroundProps {
  children: ReactNode
  overlayClassName?: string
}

export default function AppBackground({ children, overlayClassName = "bg-black/50" }: AppBackgroundProps) {
  // Shared layout keeps background visuals consistent across hero pages.
  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage:
            "url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mainimage-Y4rlZOTP9RUdC9Xor2mwCYia19aP9V.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className={`fixed inset-0 z-0 ${overlayClassName}`} />

      <ShootingStars />

      <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
    </div>
  )
}