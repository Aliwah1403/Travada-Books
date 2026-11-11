import { z } from "zod"

// Every secret the API needs is listed here. The server refuses to start if a
// required one is missing, instead of failing on the first request that needs it.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),

  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Direct Postgres for writes (Drizzle). Production: the Supabase pooler in
  // transaction mode (port 6543). Local: postgresql://postgres:postgres@127.0.0.1:54322/postgres
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "must be a postgres:// URL"),

  REDIS_URL: z.string().regex(/^rediss?:\/\//, "must be a redis:// or rediss:// URL"),

  // Comma-separated list of browser origins allowed to call the API (the app).
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  // The web app, for links in assistant answers. Local: the Vite dev server.
  APP_URL: z.url().default("http://localhost:5173"),

  // Optional: without a key, analytics and error events are skipped.
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.url().default("https://eu.i.posthog.com"),
})

export type Env = z.infer<typeof schema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source)
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n")
    throw new Error(`Invalid API environment:\n${problems}`)
  }
  return result.data
}
