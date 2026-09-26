import fs from "node:fs"
import path from "path"
import mdx from "@mdx-js/rollup"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkMdxFrontmatter from "remark-mdx-frontmatter"
import { defineConfig, type Plugin } from "vite"

// Just the mdast fields the read-time plugin touches.
type MdNode = {
  type: string
  value?: unknown
  children?: MdNode[]
  attributes?: { type: string; value?: unknown }[]
}

const WORDS_PER_MINUTE = 220

// Collects the readable text of an MDX tree: text, inline code and code
// blocks, plus the string props of custom components (CompareSplit's
// oldItems/newItems arrive as JSX expressions, so their string literals are
// pulled out of the expression source). Frontmatter and imports are skipped.
function collectText(node: MdNode, out: string[]) {
  if (node.type === "yaml" || node.type === "mdxjsEsm") return
  if ((node.type === "text" || node.type === "inlineCode" || node.type === "code") && typeof node.value === "string") {
    out.push(node.value)
  }
  for (const attribute of node.attributes ?? []) {
    if (typeof attribute.value === "string") out.push(attribute.value)
    else if (attribute.value && typeof attribute.value === "object" && "value" in attribute.value) {
      const source = String(attribute.value.value)
      for (const match of source.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)) out.push(match[1] ?? match[2])
    }
  }
  for (const child of node.children ?? []) collectText(child, out)
}

// Adds `readingTime` (whole minutes, at least 1) to each MDX file's YAML
// frontmatter at build time. Runs after remark-frontmatter has parsed the
// `yaml` node and before remark-mdx-frontmatter turns it into the
// `frontmatter` export, so index pages can read it with a frontmatter-only
// glob instead of bundling every article body.
function remarkReadingTime() {
  return (tree: MdNode) => {
    const yaml = tree.children?.find((child) => child.type === "yaml")
    if (!yaml || typeof yaml.value !== "string" || /^readingTime:/m.test(yaml.value)) return
    const out: string[] = []
    collectText(tree, out)
    const words = out.join(" ").split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length
    yaml.value = `${yaml.value}\nreadingTime: ${Math.max(1, Math.round(words / WORDS_PER_MINUTE))}`
  }
}

// Drops everything but the frontmatter, after remarkReadingTime has counted
// the body. Only used by the frontmatter-only processor below.
function remarkFrontmatterOnly() {
  return (tree: MdNode) => {
    tree.children = tree.children?.filter((child) => child.type === "yaml")
  }
}

const REMARK_PLUGINS = [remarkGfm, remarkFrontmatter, remarkReadingTime]
const FRONTMATTER_QUERY = "?frontmatter"
const FRONTMATTER_PREFIX = "\0mdx-frontmatter:"

// `import.meta.glob("…/*.mdx", { query: "?frontmatter", import: "frontmatter" })`
// resolves to a module holding only that file's `frontmatter` export (and an
// empty body). Index pages and the sitemap use it so they don't bundle every
// article body: a plain frontmatter-only glob of the .mdx files shares the
// full modules with the $slug routes, and Rollup can't split one module's
// exports across chunks. The `\0` prefix keeps the main MDX plugin (and its
// createFilter) away from these ids.
function mdxFrontmatterModules(): Plugin {
  const compiler = mdx({ remarkPlugins: [...REMARK_PLUGINS, remarkFrontmatterOnly, remarkMdxFrontmatter] })
  return {
    name: "mdx-frontmatter-modules",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!source.endsWith(FRONTMATTER_QUERY)) return null
      const resolved = await this.resolve(source.slice(0, -FRONTMATTER_QUERY.length), importer, { skipSelf: true })
      return resolved ? FRONTMATTER_PREFIX + resolved.id : null
    },
    async load(id) {
      if (!id.startsWith(FRONTMATTER_PREFIX)) return null
      const file = id.slice(FRONTMATTER_PREFIX.length)
      this.addWatchFile(file)
      const transform = compiler.transform as (this: unknown, code: string, id: string) => Promise<{ code: string } | undefined>
      const result = await transform.call(this, fs.readFileSync(file, "utf-8"), file)
      return result?.code ?? null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    mdxFrontmatterModules(),
    {
      ...mdx({
        remarkPlugins: [...REMARK_PLUGINS, remarkMdxFrontmatter],
      }),
      enforce: "pre",
    },
    reactRouter(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
})
