import { CtaBand } from "~/components/cta-band"
import { FeatureHero, FeatureRows, type FeatureRowItem } from "~/components/feature-page"
import { Faq } from "~/components/home/faq"
import { INBOX_FAQ_ITEMS } from "~/data/faq"
import { faqPageJsonLd, pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Inbox — Travada Books",
      description:
        "Connect Gmail or Outlook and receipts get pulled in on their own, matched to the transaction they belong to, and kept in your Vault where you can search them later.",
      path: "/inbox",
      image: "/og/inbox.png",
    }),
    faqPageJsonLd(INBOX_FAQ_ITEMS),
  ]
}

const ROWS: FeatureRowItem[] = [
  {
    title: "Connect Gmail or Outlook",
    body: "Connect the inbox you already use. Access is read-only — Travada Books can't send mail as you, and the only thing it pulls in is PDF attachments. Disconnect it whenever you like.",
    screenshotLabel: "Integrations page — Gmail and Outlook connect buttons",
    visual: "providers",
  },
  {
    title: "Receipts, pulled in on their own",
    body: "PDF receipts and supplier invoices that land in your inbox get picked up automatically — you don't have to forward or upload anything yourself.",
    screenshotLabel: "Inbox list — receipts pulled in from a connected account",
    visual: "capture",
  },
  {
    title: "Matched to the transaction",
    body: "When Travada Books is confident it's found the right transaction, it matches the receipt automatically. Where it's less sure, it suggests a match for you to confirm — you're never left guessing which one is right.",
    screenshotLabel: "Inbox — suggested match, confirm or reject",
    visual: "matching",
  },
  {
    title: "No inbox to connect? Forward it.",
    body: "Every organisation gets its own Travada inbox address. Forward a receipt there directly and it's picked up the same way as a connected account — kept in your Vault, matched, and searchable later.",
    screenshotLabel: "Inbox settings — your organisation's forwarding address",
    visual: "forwarding",
  },
]

export default function InboxRoute() {
  return (
    <>
      <FeatureHero
        eyebrow="Inbox"
        title="Your receipts find you."
        intro="A receipt lands in your inbox in March, and by tax time it's nowhere to be found. Connect Gmail or Outlook and Travada Books pulls it in on its own — no more digging."
      />
      <FeatureRows items={ROWS} />
      <Faq items={INBOX_FAQ_ITEMS} heading="Inbox — frequently asked questions" />
      <CtaBand heading="Let your receipts find you. Today." />
    </>
  )
}
