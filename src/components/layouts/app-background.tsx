import type { ReactNode } from "react"
import ShootingStars from "@/components/shooting-stars"
import aetheriaBackground from "@/assets/배경화면.png"

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
          backgroundImage: `url(${aetheriaBackground})`,
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
