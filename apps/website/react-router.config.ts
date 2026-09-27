import fs from "node:fs"
import path from "node:path"
import type { Config } from "@react-router/dev/config"

const CONTENT_DIR = path.resolve(__dirname, "content")

/**
 * Minimal YAML frontmatter reader — good enough for the flat string/boolean
 * fields our MDX frontmatter uses (title, summary, publishedAt, draft, ...).
 * Runs in Node at config time, so it can't use import.meta.glob (that's a
 * Vite-only feature) or the app's own lib/content.ts (which does the same
 * validation at runtime, in the browser).
 */
function readDraftFlag(filePath: string): boolean {
  const raw = fs.readFileSync(filePath, "utf-8")
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return false
  const draftLine = match[1].split(/\r?\n/).find((line) => /^draft\s*:/.test(line))
  if (!draftLine) return false
  const value = draftLine.split(":").slice(1).join(":").trim()
  return value === "true"
}

function slugsFor(collection: "updates" | "guides"): string[] {
  const dir = path.join(CONTENT_DIR, collection)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .filter((file) => !readDraftFlag(path.join(dir, file)))
    .map((file) => file.replace(/\.mdx$/, ""))
}

export default {
  ssr: false,
  async prerender({ getStaticPaths }) {
    return [
      ...getStaticPaths(),
      ...slugsFor("updates").map((slug) => `/updates/${slug}`),
      ...slugsFor("guides").map((slug) => `/guides/${slug}`),
    ]
  },
} satisfies Config
