import type { Icon } from "@travada-books/ui/icons"
import {
  GmailIcon,
  OutlookIcon,
  StripeIcon,
  Wallet01Icon,
  WhatsappIcon,
} from "@travada-books/ui/icons"

export type IntegrationStatus = "available" | "coming-soon"

export type Integration = {
  id: string
  name: string
  category: "Email" | "Payments" | "Messaging"
  description: string
  status: IntegrationStatus
  Icon: Icon
}

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
  {
    id: "mpesa",
    name: "M-Pesa",
    category: "Payments",
    description: "Sync incoming payments and accept M-Pesa payments from invoices.",
    status: "coming-soon",
    Icon: Wallet01Icon,
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
