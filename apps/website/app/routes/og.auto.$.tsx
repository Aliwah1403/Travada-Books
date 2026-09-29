import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"

import { Resvg } from "@resvg/resvg-js"
import satori, { type SatoriOptions } from "satori"

import { getOgCard } from "~/lib/og"

import type { Route } from "./+types/og.auto.$"

// Share cards, Midday-style (their apps/website/src/app/api/og): a small
// JSX layout rendered to a 1200×630 PNG — Satori draws it to SVG (the same
// renderer behind Next's ImageResponse / @vercel/og, which doesn't run
// outside Next), resvg rasterises it. Resource route (no default export),
// so the prerender writes each loader's body straight to
// build/client/og/auto/<key>.png — the full list is in
// react-router.config.ts. Routes point at them via ogImage() in lib/og.ts.
//
// Satori takes inline styles only, hex colours (no oklch) and static
// .woff/.ttf fonts, so tokens are mirrored below and Geist comes from
// @fontsource/geist rather than the site's variable font.

// app.css tokens, as hex.
const C = {
  canvas: "#f8f6f3",
  panel: "#ffffff",
  line: "#e3e1de",
  lineStrong: "#c0bdb9",
  ink: "#181611",
  inkMuted: "#5b5752",
  inkSubtle: "#77746f",
  brandLine: "#2e8c7c",
}

const require = createRequire(import.meta.url)

async function font(pkg: string, file: string) {
  return readFile(require.resolve(`${pkg}/files/${file}`))
}

type Fonts = SatoriOptions["fonts"]
let assets: Promise<{ fonts: Fonts; logo: string }> | null = null
function loadAssets() {
  assets ??= (async () => {
    const [regular, medium, mono, logo] = await Promise.all([
      font("@fontsource/geist", "geist-latin-400-normal.woff"),
      font("@fontsource/geist", "geist-latin-500-normal.woff"),
      font("@fontsource/geist-mono", "geist-mono-latin-400-normal.woff"),
      readFile(path.resolve("public/logo.svg")),
    ])
    return {
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: medium, weight: 500, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ] satisfies Fonts,
      logo: `data:image/svg+xml;base64,${logo.toString("base64")}`,
    }
  })()
  return assets
}

// The card's dot field, drawn as an SVG image: Satori's CSS gradient
// backgrounds don't tile or mask reliably, but resvg renders SVG patterns
// and masks exactly. Sized to the inner panel's height (630 − 2×32 − 2×1).
const DOTS_W = 420
const DOTS_H = 564
const DOTS = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${DOTS_W}" height="${DOTS_H}">
    <defs>
      <pattern id="d" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="1.3" fill="${C.lineStrong}"/></pattern>
      <linearGradient id="f" x1="1" x2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="m"><rect width="100%" height="100%" fill="url(#f)"/></mask>
    </defs>
    <rect width="100%" height="100%" fill="url(#d)" mask="url(#m)"/>
  </svg>`,
).toString("base64")}`

// Long headlines step down so they stay within three lines.
function titleSize(title: string) {
  if (title.length > 80) return 52
  if (title.length > 56) return 60
  return 72
}

export async function loader({ params }: Route.LoaderArgs) {
  const key = (params["*"] ?? "").replace(/\.png$/, "")
  const card = getOgCard(key)
  if (!card) throw new Response("Not found", { status: 404 })
  const { fonts, logo } = await loadAssets()

  const svg = await satori(
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 32, backgroundColor: C.canvas, fontFamily: "Geist" }}>
      <div
        style={{
          display: "flex",
          position: "relative",
          flex: 1,
          border: `1px solid ${C.line}`,
          backgroundColor: C.panel,
        }}
      >
        {/* Dot field fading in from the right edge, as on the site's hero planes */}
        {/* Rendered to a PNG, never shown as HTML, so no alt text. */}
        <img src={DOTS} width={DOTS_W} height={DOTS_H} style={{ position: "absolute", top: 0, right: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "56px 56px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Rendered to a PNG, never shown as HTML, so no alt text. */}
            <img src={logo} height={30} width={30} />
            <span style={{ fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: "-0.01em" }}>Travada Books</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "Geist Mono",
                fontSize: 15,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: C.inkMuted,
              }}
            >
              <div style={{ width: 8, height: 8, backgroundColor: C.brandLine }} />
              {card.eyebrow}
            </div>
            <div
              style={{
                marginTop: 20,
                maxWidth: 900,
                fontSize: titleSize(card.title),
                fontWeight: 500,
                lineHeight: 1.04,
                letterSpacing: "-0.035em",
                color: C.ink,
                textWrap: "balance",
              }}
            >
              {card.title}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "auto",
              paddingTop: 28,
              fontFamily: "Geist Mono",
              fontSize: 15,
              letterSpacing: "0.04em",
              color: C.inkSubtle,
            }}
          >
            travadabooks.com
          </div>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, fonts },
  )
  const png = new Resvg(svg).render().asPng()
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } })
}
