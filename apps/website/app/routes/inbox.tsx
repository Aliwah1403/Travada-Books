import {
  InboxIcon,
  Link01Icon,
  LockPasswordIcon,
  Mail01Icon,
  Search01Icon,
  SparklesIcon,
  Upload01Icon,
} from "@travada-books/ui/icons"

import { FeaturePage, type FeaturePageContent } from "~/components/feature/feature-page"
import { InboxListMockup } from "~/components/feature/mockups/inbox/inbox-list"
import { ReceiptMatchFragments } from "~/components/feature/mockups/inbox/receipt-match-fragments"
import { ConnectInboxesMockup } from "~/components/feature/mockups/inbox/connect-inboxes"
import { SuggestedMatchMockup } from "~/components/feature/mockups/inbox/suggested-match"
import { INBOX_FAQ_ITEMS } from "~/data/faq"
import { faqPageJsonLd, pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return [
    ...pageMeta({
      title: "Inbox — Travada Books",
      description:
        "Connect Outlook, or forward receipts from any inbox, and they get pulled in on their own, matched to the transaction they belong to, and kept in your Vault where you can search them later.",
      path: "/inbox",
      image: "/og/inbox.png",
    }),
    faqPageJsonLd(INBOX_FAQ_ITEMS),
  ]
}

const CONTENT: FeaturePageContent = {
  eyebrow: { label: "Inbox", icon: InboxIcon },
  title: "Your receipts find you.",
  lede: "A receipt lands in your inbox in March, and by tax time it's nowhere to be found. Connect Outlook or forward it to your Travada address and Travada Books pulls it in on its own — no more digging.",
  heroLayout: "floating",
  visual: <ReceiptMatchFragments />,
  rows: [
    {
      label: "Connect",
      icon: Mail01Icon,
      title: "Connect Outlook, or forward from any inbox",
      body: "Connect your Outlook mailbox with read-only access — Travada Books can't send mail as you, and the only thing it pulls in is PDF attachments. Using Gmail or another provider? Forward receipts to your Travada inbox address instead.",
      visual: <ConnectInboxesMockup />,
    },
    {
      label: "Capture",
      icon: Upload01Icon,
      title: "Receipts, pulled in on their own",
      body: "PDF receipts and supplier invoices that land in your connected Outlook inbox, or arrive at your Travada inbox address, get picked up automatically — you don't have to upload anything yourself.",
      visual: <InboxListMockup />,
    },
    {
      label: "Matching",
      icon: Link01Icon,
      title: "Matched to the transaction",
      body: "When Travada Books is confident it's found the right transaction, it matches the receipt automatically. Where it's less sure, it suggests a match for you to confirm — you're never left guessing which one is right.",
      visual: <SuggestedMatchMockup />,
    },
  ],
  details: [
    {
      title: "No inbox to connect? Forward it.",
      body: "Every organisation gets its own Travada inbox address. Forward a receipt there and it's picked up the same way.",
      icon: InboxIcon,
    },
    {
      title: "Read-only access",
      body: "Only PDF attachments on emails you didn't send are pulled in. Nothing else is stored.",
      icon: LockPasswordIcon,
    },
    {
      title: "Titled for you",
      body: "Each receipt is read and titled automatically when it arrives in your Vault.",
      icon: SparklesIcon,
    },
    {
      title: "Searchable later",
      body: "Find a receipt by its name or by what's actually on the document.",
      icon: Search01Icon,
    },
  ],
  faq: { title: "Inbox questions", items: INBOX_FAQ_ITEMS },
}

export default function InboxRoute() {
  return <FeaturePage content={CONTENT} />
}
