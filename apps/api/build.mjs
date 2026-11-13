// Bundles the API for Node. Third-party packages stay external (installed by
// npm on Render); our own workspace packages (@travada-books/*) ship as
// TypeScript source, so they're bundled in — Node can't run .ts from
// node_modules.
import { build } from "esbuild"

const workspacePrefix = "@travada-books/"

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: true,
  logLevel: "info",
  plugins: [
    {
      name: "external-third-party",
      setup(b) {
        // Bare specifiers (not ./ or /) that aren't ours → external.
        b.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.path.startsWith(workspacePrefix)) return undefined
          return { path: args.path, external: true }
        })
      },
    },
  ],
})
