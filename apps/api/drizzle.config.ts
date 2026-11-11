import { defineConfig } from "drizzle-kit"

// Drizzle is only the API's query layer. The schema is introspected from the
// database (`npm run db:pull`); migrations stay as Supabase SQL files in
// supabase/migrations — never run drizzle-kit generate/migrate/push.
export default defineConfig({
  dialect: "postgresql",
  out: "./src/db/introspected",
  schemaFilter: ["public"],
  // Local-only tables from the unmerged UAE bank-sync work (not in production).
  tablesFilter: ["!bank_*"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" },
})
