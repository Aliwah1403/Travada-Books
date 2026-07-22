import { useEffect } from "react"

import { PitchCarousel } from "@/components/pitch/pitch-carousel"

export function PitchPage() {
  useEffect(() => {
    document.title = "Travada Books — Pitch"
    return () => {
      document.title = "Travada Books"
    }
  }, [])

  return <PitchCarousel />
}
