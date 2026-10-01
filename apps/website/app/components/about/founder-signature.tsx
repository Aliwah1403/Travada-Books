import { cn } from "@travada-books/ui/lib/utils"

// Founders' signatures for the About sign-off. Curtis's is the real one,
// scanned from paper (rotated upright, ink isolated to black on a
// transparent PNG). Nate's is still a ⚠️ PLACEHOLDER scribble — swap it for
// /images/about/signature-nate.png the same way once supplied.
const NATE_PLACEHOLDER =
  "M8 40c6-20 12-30 16-26 4 5-8 26-2 28 6 2 14-24 20-22 5 2-2 18 4 19 8 1 12-12 20-13 7-1 6 10 14 9 7-1 12-7 20-6"

export function FounderSignature({ name, className }: { name: "curtis" | "nate"; className?: string }) {
  if (name === "curtis") {
    return (
      <img
        src="/images/about/signature-curtis.png"
        alt="Curtis's signature"
        width={360}
        height={329}
        loading="lazy"
        decoding="async"
        className={cn("h-20 w-auto", className)}
      />
    )
  }
  return (
    <svg role="img" aria-label="Nate's signature" viewBox="0 0 150 56" fill="none" className={cn("h-12 w-auto text-ink", className)}>
      <path d={NATE_PLACEHOLDER} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
