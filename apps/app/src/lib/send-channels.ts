export type SendChannel = "email" | "whatsapp" | "link" | "pdf" | "manual"

const LABELS: Record<SendChannel, string> = {
  email: "Sent by email",
  whatsapp: "Sent via WhatsApp",
  link: "Sent via link",
  pdf: "Sent as PDF",
  manual: "Marked as sent",
}

export function sentActivityLabel(channel: string | null | undefined): string {
  if (channel && channel in LABELS) return LABELS[channel as SendChannel]
  return "Sent"
}
