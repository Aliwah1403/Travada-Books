import type { Icon } from "@travada-books/ui/icons"
import {
  BankIcon,
  GmailIcon,
  MpesaIcon,
  OutlookIcon,
  StripeIcon,
  WhatsappIcon,
} from "@travada-books/ui/icons"

export type IntegrationStatus = "available" | "coming-soon"

export type Integration = {
  id: string
  name: string
  category: IntegrationCategory
  description: string
  status: IntegrationStatus
  Icon: Icon
  /** A monochrome Hugeicon rather than a brand mark — tint it in the UI. */
  glyph?: boolean
}

export type IntegrationCategory = "Email" | "Imports" | "Payments" | "Messaging"

// Display order for grouped lists (/integrations catalogue).
export const INTEGRATION_CATEGORIES: IntegrationCategory[] = ["Email", "Imports", "Payments", "Messaging"]

export const INTEGRATIONS: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    category: "Email",
    description: "Pull PDF receipts and supplier invoices from a connected Gmail mailbox into your Travada Inbox.",
    status: "available",
    Icon: GmailIcon,
  },
  {
    id: "outlook",
    name: "Outlook",
    category: "Email",
    description: "Bring receipts and invoices in from Microsoft Outlook with a read-only connection.",
    status: "available",
    Icon: OutlookIcon,
  },
  // Statement imports are uploads, not connections, but they're live and
  // they belong in the catalogue. The home hub (home/integrations-hub.tsx)
  // looks entries up by id, so adding these doesn't change it.
  {
    id: "bank-statements",
    name: "Bank statements",
    category: "Imports",
    description: "Upload a statement from any bank, PDF or CSV. The columns are worked out for you, split debit and credit included.",
    status: "available",
    Icon: BankIcon,
    glyph: true,
  },
  {
    id: "mpesa-statements",
    name: "Mobile money statements",
    category: "Imports",
    description: "Upload a mobile money statement, such as M-Pesa, as PDF or CSV, and every transaction comes in sorted.",
    status: "available",
    Icon: MpesaIcon,
  },
  {
    id: "mpesa",
    name: "M-Pesa",
    category: "Payments",
    description: "Sync incoming payments and accept M-Pesa payments from invoices.",
    status: "coming-soon",
    Icon: MpesaIcon,
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    description: "Accept card payments directly from a Travada Books invoice.",
    status: "coming-soon",
    Icon: StripeIcon,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    category: "Messaging",
    description: "Send invoices and reminders through the channel your customers already use.",
    status: "coming-soon",
    Icon: WhatsappIcon,
  },
]
