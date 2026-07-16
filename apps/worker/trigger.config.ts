import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_wxjybfipyhpppgrynypl",
  runtime: "node-22",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  build: {
    // heic-convert → heic-decode → libheif-js loads `libheif.wasm` as a real
    // sidecar file, resolved relative to __dirname via readFileSync. Bundling
    // it would repoint __dirname at the esbuild output dir, where the .wasm
    // was never copied — so HEIC conversion would ENOENT on the first iPhone
    // receipt in production while working fine in dev. autoDetectExternal only
    // catches native .node addons, not this.
    external: ["heic-convert"],
  },
});
