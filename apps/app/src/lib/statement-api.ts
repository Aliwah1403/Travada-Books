import { api, unwrap } from "@/lib/api";

// Statement writes through the API (API-WRITES-PLAN.md domain 3). Used only
// when apiWritesEnabled("statements") is on; otherwise the pages keep their
// direct Supabase writes. The API works out what goes on the statement
// (invoices, payments, opening balance) and the snapshots itself.

/** A fresh key per user action, so a retried request can't run twice. */
const idem = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } });

export const statementApi = {
  create: (input: {
    customer_id: string;
    date_from: string;
    date_to: string;
    notes: string | null;
    include_pdf: boolean;
  }) => unwrap(api.v1.statements.$post({ json: input }, idem())),

  send: (id: string) => unwrap(api.v1.statements[":id"].send.$post({ param: { id } }, idem())),

  remove: (id: string) => unwrap(api.v1.statements[":id"].$delete({ param: { id } })),
};
