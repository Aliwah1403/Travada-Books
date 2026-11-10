// Tells IndexNow (Bing, and through it ChatGPT search and Copilot, plus Yandex,
// Naver and others) about pages that changed today, so new updates and guides
// are crawled within hours instead of days.
//
// Reads the LIVE sitemap, so it only ever submits what is actually deployed:
// a page counts as changed when its <lastmod> (an update's or guide's
// updatedAt ?? publishedAt) is today in East Africa Time. Core pages carry no
// lastmod (see app/lib/sitemap.ts), so they only go out with --all. Runs after
// every production deploy of the website (.github/workflows/indexnow.yml);
// safe to re-run.
//
//   node scripts/indexnow.mjs               # pages changed today
//   node scripts/indexnow.mjs --date 2026-10-20
//   node scripts/indexnow.mjs --all         # every page in the sitemap
//   node scripts/indexnow.mjs --dry-run     # list, don't submit
//
// No dependencies, so it runs without an npm install.

// Keep in step with SITE_URL in app/data/site.ts.
const SITE_URL = "https://travadabooks.com"
const HOST = new URL(SITE_URL).host
// Public by design: IndexNow checks that ${SITE_URL}/${KEY}.txt holds it
// (public/cd45d8d1462e9e7d5d9ed59c4979d520.txt).
const KEY = "cd45d8d1462e9e7d5d9ed59c4979d520"

const args = process.argv.slice(2)
const all = args.includes("--all")
const dryRun = args.includes("--dry-run")
const dateArg = args[args.indexOf("--date") + 1]
const date =
  args.includes("--date") && dateArg
    ? dateArg
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date())

const response = await fetch(`${SITE_URL}/sitemap.xml`)
if (!response.ok) {
  console.error(`Could not fetch the sitemap: HTTP ${response.status}`)
  process.exit(1)
}
const xml = await response.text()

const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => ({
  loc: body.match(/<loc>(.*?)<\/loc>/)?.[1],
  lastmod: body.match(/<lastmod>(.*?)<\/lastmod>/)?.[1],
}))

const urls = entries.filter((entry) => entry.loc && (all || entry.lastmod === date)).map((entry) => entry.loc)

if (urls.length === 0) {
  console.log(`Nothing changed on ${date}; nothing to submit.`)
  process.exit(0)
}

console.log(`${all ? "All pages" : `Changed on ${date}`} (${urls.length}):\n${urls.join("\n")}`)
if (dryRun) process.exit(0)

const submit = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `${SITE_URL}/${KEY}.txt`,
    urlList: urls,
  }),
})

// 200 = accepted, 202 = accepted while the key is being verified.
if (submit.status === 200 || submit.status === 202) {
  console.log(`Submitted to IndexNow (HTTP ${submit.status}).`)
} else {
  console.error(`IndexNow refused the submission: HTTP ${submit.status} ${await submit.text()}`)
  process.exit(1)
}
