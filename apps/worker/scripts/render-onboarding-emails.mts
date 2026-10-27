// Renders the onboarding sequence to static HTML.
//
//   npx tsx scripts/render-onboarding-emails.mts <out-dir> [--preview]
//
// Without --preview the files keep Resend's {{{…}}} placeholders (what gets uploaded
// as templates). With --preview, placeholders are filled with sample values and an
// index.html gallery is written alongside the emails.
import React from "react"
import { cp, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { render } from "@react-email/render"
import { ONBOARDING_SEQUENCE } from "../src/emails/onboarding/sequence"
import { FIRST_NAME, UNSUBSCRIBE_URL, IMG_URL } from "../src/emails/onboarding/components"

const [outDir, flag] = process.argv.slice(2)
if (!outDir) {
  console.error("usage: render-onboarding-emails.mts <out-dir> [--preview]")
  process.exit(1)
}
const preview = flag === "--preview"

// Preview images are copied next to the HTML, since the website hasn't deployed them yet.
const IMG_SRC_DIR = path.resolve(import.meta.dirname, "../../website/public/email")

function fillSamples(html: string) {
  return html
    .replaceAll(FIRST_NAME, "Amara")
    .replaceAll(UNSUBSCRIBE_URL, "#")
    .replaceAll(`${IMG_URL}/`, "img/")
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}

await mkdir(outDir, { recursive: true })

const cards: string[] = []
let day = 0
for (const [i, step] of ONBOARDING_SEQUENCE.entries()) {
  const raw = await render(React.createElement(step.Email))
  const html = preview ? fillSamples(raw) : raw
  const file = `${step.alias}.html`
  await writeFile(path.join(outDir, file), html)

  if (step.delay) day += Number.parseInt(step.delay, 10)
  cards.push(`
    <section class="email" id="${step.alias}">
      <header>
        <div class="meta"><span class="num">${String(i + 1).padStart(2, "0")}</span> Day ${day}</div>
        <div class="inbox">
          <div class="from">Curtis at Travada Books</div>
          <div class="subject">${escapeHtml(step.subject)}</div>
          <div class="snippet">${escapeHtml(step.preview)}</div>
        </div>
      </header>
      <iframe src="${file}" title="${escapeHtml(step.subject)}" loading="lazy"></iframe>
    </section>`)
  console.log(`rendered ${file}`)
}

if (preview) {
  await cp(IMG_SRC_DIR, path.join(outDir, "img"), { recursive: true })
  await writeFile(
    path.join(outDir, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Onboarding Emails</title>
<style>
  :root { --bg:#f4f4f2; --card:#fff; --ink:#111827; --muted:#6b7280; --line:#e5e7eb; --accent:#007a55; }
  * { box-sizing:border-box }
  body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif }
  .intro { max-width:760px; margin:0 auto; padding:40px 16px 8px }
  h1 { font-size:22px; margin:0 0 6px }
  .intro p { color:var(--muted); margin:0 0 4px }
  nav { display:flex; flex-wrap:wrap; gap:6px; margin-top:16px }
  nav a { font-size:12px; color:var(--ink); text-decoration:none; border:1px solid var(--line); background:#fff; border-radius:999px; padding:4px 10px }
  .email { max-width:760px; margin:24px auto; padding:0 16px }
  .email header { background:var(--card); border:1px solid var(--line); border-bottom:none; border-radius:10px 10px 0 0; padding:14px 18px }
  .meta { font-size:12px; color:var(--muted); margin-bottom:8px }
  .num { font-weight:600; color:var(--accent); margin-right:4px }
  code { font-size:11px; background:#f3f4f6; padding:1px 5px; border-radius:4px }
  .from { font-weight:600; font-size:13px }
  .subject { font-weight:600; font-size:15px }
  .snippet { color:var(--muted); font-size:13px }
  iframe { display:block; width:100%; height:900px; border:1px solid var(--line); border-radius:0 0 10px 10px; background:#fff }
</style></head><body>
<div class="intro">
  <h1>Travada Books onboarding sequence</h1>
  <p>${ONBOARDING_SEQUENCE.length} emails over ${day} days, all from Curtis, sent to every new account in the same order. Each one covers a single feature, has one button, and ends by saying what the next email covers.</p>
  <nav>${ONBOARDING_SEQUENCE.map((s, i) => `<a href="#${s.alias}">${i + 1}. ${escapeHtml(s.subject)}</a>`).join("")}</nav>
</div>
${cards.join("\n")}
<script>
  // Size each iframe to its email so the page scrolls as one document.
  document.querySelectorAll("iframe").forEach((f) => f.addEventListener("load", () => {
    try { f.style.height = f.contentDocument.documentElement.scrollHeight + "px" } catch {}
  }))
</script>
</body></html>`
  )
  console.log("wrote index.html")
}
