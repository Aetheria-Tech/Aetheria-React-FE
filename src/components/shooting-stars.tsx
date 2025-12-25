"use client"

import { useEffect, useState } from "react"

function ShootingStar({ delay }: { delay: number }) {
  const [style, setStyle] = useState({})

  useEffect(() => {
    const randomTop = Math.random() * 20
    const randomLeft = Math.random() * 100
    const randomDuration = 2 + Math.random() * 2
    setStyle({
      top: `${randomTop}%`,
      left: `${randomLeft}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${randomDuration}s`,
    })
  }, [delay])

  return <div className="shooting-star absolute w-1 h-1 bg-white rounded-full opacity-0" style={style} />
}

export default function ShootingStars() {
  return (
    <>
      <div className="fixed inset-0 z-[5] pointer-events-none overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <ShootingStar key={i} delay={i * 10} />
        ))}
      </div>

      <style>{`
        @keyframes shooting {
          0% {
            transform: translateX(0) translateY(0) rotate(-45deg);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(300px) translateY(300px) rotate(-45deg);
            opacity: 0;
          }
        }

        .shooting-star {
          animation: shooting 3s ease-in infinite;
        }
      `}</style>
    </>
  )
}
