/// <reference types="vite/client" />

declare module "*.svg" {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  /** apps/api origin. Defaults to http://localhost:8787 in dev. */
  readonly VITE_API_URL?: string;
  /** Local override for lib/api-flags.ts: "invoices,quotes" or "all". */
  readonly VITE_API_WRITES?: string;
  readonly VITE_API_READS?: string;
}
