import type { Icon } from "@travada-books/ui/icons"

// Soft brand-colored glow behind each integration's logo — the one
// deliberately distinctive visual detail from the reference gallery.
// `rounded-full` here is a decorative circular shape, unrelated to the
// app's `--radius: 0` token (which only affects rounded-md/lg/xl utilities).
const glowClassName: Record<IntegrationBrand, string> = {
  gmail: "bg-red-400/20",
  outlook: "bg-blue-500/20",
  mpesa: "bg-[#00A651]/20",
  stripe: "bg-[#635bff]/20",
  whatsapp: "bg-[#25D366]/20",
}

export type IntegrationBrand = "gmail" | "outlook" | "mpesa" | "stripe" | "whatsapp"

export function IntegrationIcon({
  brand,
  icon: BrandIcon,
  size = 26,
}: {
  brand: IntegrationBrand
  icon: Icon
  size?: number
}) {
  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center">
      <div aria-hidden className={`absolute size-10 rounded-full blur-xl ${glowClassName[brand]}`} />
      <BrandIcon size={size} className="relative" />
    </div>
  )
}
