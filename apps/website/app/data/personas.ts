// Booklet P5 personas — shared between the home page's "Who it's for" card
// grid (home/who-its-for.tsx) and the full /who-its-for page, so the copy
// only lives in one place. `linkHref`/`linkLabel` are only used on the full
// page — home just renders `title` + `body`.

export type Persona = {
  id: string
  title: string
  body: string
  detail: string
  linkHref: string
  linkLabel: string
}

export const PERSONAS: Persona[] = [
  {
    id: "freelancer",
    title: "The freelancer",
    body: "who is very good at the work, and very bad at remembering to follow up on invoice #14.",
    detail:
      "You send the invoice, and then the work happens — a client call, another project, a month goes by. Chasing an unpaid invoice feels like nagging, so it quietly stops happening. Set a reminder once and Travada Books does the chasing. It goes out at the same distance from the due date every time, whether you remembered or not.",
    linkHref: "/invoicing",
    linkLabel: "See how reminders work",
  },
  {
    id: "retainer-consultant",
    title: "The consultant on a retainer",
    body: "who has re-typed the same invoice every month for two years and has stopped noticing that this is strange.",
    detail:
      "Same client, same amount, every month — and every month, a fresh invoice built from scratch. Set the amount and frequency once and it sends itself from then on, weekly, every two weeks, monthly, quarterly or yearly. You can see the next three dates it'll go out before you commit to anything, and stop it whenever the retainer ends.",
    linkHref: "/invoicing",
    linkLabel: "See recurring invoices",
  },
  {
    id: "notebook-owner",
    title: "The small business owner",
    body: "running the books in a notebook, and knowing — quietly, without saying it out loud — that the notebook is not going to survive growth.",
    detail:
      "The notebook works, until it doesn't — a page gets skipped, a receipt goes missing, and there's no way to see the whole picture at once. Upload the statements you already have, bank or M-Pesa, and they come in sorted, with a dashboard that shows what the notebook never could.",
    linkHref: "/statement-import",
    linkLabel: "See statement import",
  },
  {
    id: "agency",
    title: "The agency",
    body: "sending five quotes a week and retyping every single one that gets accepted.",
    detail:
      "A client says yes to a quote, and then someone has to turn that quote into an invoice by hand — same line items, same numbers, typed in again. A customer accepts a quote with a link, no app, no signup, and it's turned into a draft invoice for you. Nobody retypes anything.",
    linkHref: "/invoicing",
    linkLabel: "See quotes that become invoices",
  },
  {
    id: "mpesa-backlog",
    title: "Anyone at all",
    body: "with a year of M-Pesa statements they have been meaning to sort out properly since January.",
    detail:
      "It's been on the list all year: sit down, go through the M-Pesa statements, work out what was actually for the business. Upload the statement instead. Travada Books reads it, works out what came in and what went out, and sorts it — the backlog you've been meaning to get to, gone in one upload.",
    linkHref: "/statement-import",
    linkLabel: "See statement import",
  },
]
