import { cn } from "@travada-books/ui/lib/utils"

type ScreenshotFrameProps = {
  /** Shown as placeholder text when no `src` is set, and as the fallback alt text. */
  label: string
  src?: string
  alt?: string
  width?: number
  height?: number
  /** width / height, e.g. 16/10 (the default). */
  aspectRatio?: number
  className?: string
}

// No real screenshots exist yet (batch 2) — this renders a bordered
// placeholder frame with the label centred, matching the final screenshot's
// aspect ratio so the layout doesn't shift once real images land.
export function ScreenshotFrame({
  label,
  src,
  alt,
  width,
  height,
  aspectRatio = 16 / 10,
  className,
}: ScreenshotFrameProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
      style={{ aspectRatio }}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? label}
          loading="lazy"
          decoding="async"
          width={width}
          height={height}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="px-6 text-center font-mono text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  )
}
