#!/usr/bin/env node
/**
 * Pulls shadcnblocks sources into app/components/blocks/ without the side
 * effects of `shadcn add`, which in this monorepo would overwrite
 * packages/ui components (badge, button, …) with the Radix originals and
 * `npm install` the `cn` placeholder and lucide-react.
 *
 * This script only ever writes inside app/components/blocks/. It rewrites
 * registry imports to our packages and prints what still needs adapting by
 * hand: lucide icons → @travada-books/ui/icons, asChild → Base UI `render`,
 * and any component or npm dependency we don't have yet.
 *
 *   npm run add-block --workspace=website -- hero1 feature166
 *   npm run add-block --workspace=website -- hero1 --force   # replace existing
 *
 * `components.json` in this workspace mirrors the same aliases, so the shadcn
 * CLI's read-only commands (`view`, `search`, `add --dry-run`) still work for
 * browsing the catalog.
 */
import fs from "node:fs"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const WEBSITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const REPO_ROOT = path.resolve(WEBSITE_DIR, "../..")
const BLOCKS_DIR = path.join(WEBSITE_DIR, "app/components/blocks")
const UI_COMPONENTS_DIR = path.join(REPO_ROOT, "packages/ui/src/components")
const REGISTRY_URL = "https://www.shadcnblocks.com/r"

// Dependencies the registry declares that we deliberately never install.
const IGNORED_DEPS = new Set(["cn", "lucide-react"])

function readApiKey() {
  if (process.env.SHADCNBLOCKS_API_KEY) return process.env.SHADCNBLOCKS_API_KEY
  const envFile = path.join(REPO_ROOT, ".env.local")
  if (!fs.existsSync(envFile)) return null
  const line = fs
    .readFileSync(envFile, "utf-8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("SHADCNBLOCKS_API_KEY="))
  return line ? line.slice(line.indexOf("=") + 1).replace(/^["']|["']$/g, "") : null
}

function rewriteImports(source) {
  return source
    .replace(/from ["']cn["']/g, 'from "@travada-books/ui/lib/utils"')
    .replace(/from ["']@\/lib\/utils["']/g, 'from "@travada-books/ui/lib/utils"')
    .replace(/from ["']@\/components\/ui\/([^"']+)["']/g, 'from "@travada-books/ui/components/$1"')
    .replace(/from ["']@\/hooks\/([^"']+)["']/g, 'from "~/hooks/$1"')
    .replace(/from ["']@\/components\/([^"']+)["']/g, 'from "~/components/blocks/$1"')
}

/** block/hero1/hero1.tsx → hero1.tsx; block/foo/parts/x.tsx → foo/parts/x.tsx */
function targetPath(item, file) {
  const rel = file.path.replace(/^(block|blocks|components)\//, "")
  const parts = rel.split("/")
  if (item.files.length === 1) return parts[parts.length - 1]
  if (parts[0] === item.name) return rel
  return path.join(item.name, rel)
}

function report(label, values) {
  if (values.length) console.log(`  ${label}: ${values.join(", ")}`)
}

async function addBlock(name, { apiKey, force, websiteDeps }) {
  const res = await fetch(`${REGISTRY_URL}/${name}`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  })
  if (!res.ok) throw new Error(`${name}: registry returned ${res.status}`)
  const item = await res.json()

  console.log(`\n${item.name} — ${item.title ?? ""}`)
  const written = []
  const lucideIcons = new Set()
  let asChildCount = 0

  for (const file of item.files ?? []) {
    const dest = path.join(BLOCKS_DIR, targetPath(item, file))
    if (!dest.startsWith(BLOCKS_DIR + path.sep)) {
      throw new Error(`${name}: refusing to write outside blocks dir (${file.path})`)
    }
    if (fs.existsSync(dest) && !force) {
      console.log(`  skipped (exists, pass --force): ${path.relative(WEBSITE_DIR, dest)}`)
      continue
    }
    const content = rewriteImports(file.content)
    for (const m of content.matchAll(/import\s*\{([^}]+)\}\s*from ["']lucide-react["']/g)) {
      m[1].split(",").map((s) => s.trim()).filter(Boolean).forEach((i) => lucideIcons.add(i))
    }
    asChildCount += (content.match(/\basChild\b/g) ?? []).length
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, content)
    written.push(dest)
    console.log(`  wrote ${path.relative(WEBSITE_DIR, dest)}`)
  }

  const missingUi = (item.registryDependencies ?? []).filter((dep) => {
    if (dep.startsWith("@") || dep.includes("/")) return true
    return !fs.existsSync(path.join(UI_COMPONENTS_DIR, `${dep}.tsx`))
  })
  const missingNpm = (item.dependencies ?? [])
    .map((d) => d.replace(/(.)@.*$/, "$1"))
    .filter((d) => !IGNORED_DEPS.has(d) && !websiteDeps.has(d))

  report("swap lucide → @travada-books/ui/icons", [...lucideIcons])
  if (asChildCount) report("asChild → Base UI render prop", [`${asChildCount} occurrence(s)`])
  report("registry deps not in packages/ui (port by hand)", missingUi)
  report("npm deps not in website package.json", missingNpm)
  return written
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes("--force")
  const names = args.filter((a) => !a.startsWith("--"))
  if (!names.length) {
    console.error("usage: add-block <name> [<name> …] [--force]")
    process.exit(1)
  }

  const apiKey = readApiKey()
  if (!apiKey) console.warn("SHADCNBLOCKS_API_KEY not found — only free blocks will resolve.")

  const pkg = JSON.parse(fs.readFileSync(path.join(WEBSITE_DIR, "package.json"), "utf-8"))
  const websiteDeps = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }))

  const written = []
  let failed = false
  for (const name of names) {
    try {
      written.push(...(await addBlock(name, { apiKey, force, websiteDeps })))
    } catch (err) {
      failed = true
      console.error(`  ✗ ${err.message}`)
    }
  }

  if (written.length) {
    execFileSync("npx", ["prettier", "--write", ...written], { cwd: REPO_ROOT, stdio: "ignore" })
  }
  if (failed) process.exit(1)
}

main()
