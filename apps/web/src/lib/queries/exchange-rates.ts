import { supabase } from "@/lib/supabase"

export async function lookupRate(base: string, target: string): Promise<number | null> {
  if (base === target) return 1
  const { data } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base", base)
    .eq("target", target)
    .maybeSingle()
  return (data?.rate as number) ?? null
}
