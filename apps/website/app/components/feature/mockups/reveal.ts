import { useEffect, useRef, type CSSProperties } from "react"

/** Props that make an element one step of a staggered entrance (CSS in
 *  app.css). Harmless when the container never arms the reveal. */
export function revealStep(index: number): { "data-reveal-item": ""; style: CSSProperties } {
  return { "data-reveal-item": "", style: { "--reveal-i": index } as CSSProperties }
}

// One-time staggered entrance (CSS in app.css). Only armed after hydration,
// only for a mockup or illustration that starts below the fold, never under reduced motion,
// so the prerendered HTML is always fully visible.
export function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (el.getBoundingClientRect().top < window.innerHeight) return
    el.dataset.reveal = "pending"
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.dataset.reveal = "shown"
        observer.disconnect()
      },
      { rootMargin: "0px 0px -15% 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}
