import { supabase } from "@/lib/supabase"

export async function lookupRate(base: string, target: string): Promise<number | null> {
  if (base === target) return 1
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base", base)
    .eq("target", target)
    .maybeSingle()
  if (error) throw error
  return (data?.rate as number) ?? null
}
