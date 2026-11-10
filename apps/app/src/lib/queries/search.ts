import { supabase } from "@/lib/supabase"

export type SearchResultType =
  | "customer"
  | "invoice"
  | "quote"
  | "transaction"
  | "document"
  | "inbox"
  | "bill"
  | "statement"

export type SearchResult = {
  type: SearchResultType
  id: string
  title: string | null
  subtitle: string | null
  amount: number | null
  currency: string | null
  status: string | null
  date: string | null
  rank: number
}

export async function globalSearch(orgId: string, term: string): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc("global_search", {
    p_org_id: orgId,
    p_term: term,
    p_limit: 5,
  })

  if (error) throw error
  return (data ?? []) as SearchResult[]
}
