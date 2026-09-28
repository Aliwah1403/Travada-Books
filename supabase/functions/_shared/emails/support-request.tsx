import React from "npm:react"
import { Text, Section } from "../email-components.ts"
import { EmailLayout, CtaButton, colors } from "../email-layout.tsx"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// Urgency pill colours — the same Tailwind 700-on-100 pairs the app uses
// for status badges.
const URGENCY_STYLE: Record<string, { color: string; background: string }> = {
  low:    { color: "#374151", background: "#F3F4F6" },
  normal: { color: "#1D4ED8", background: "#DBEAFE" },
  high:   { color: "#B45309", background: "#FEF3C7" },
  urgent: { color: "#B91C1C", background: "#FEE2E2" },
}

interface Props {
  reference: string
  name: string
  email: string
  businessName: string | null
  topicLabel: string
  areaLabel: string | null
  urgency: string | null
  urgencyLabel: string | null
  subject: string
  message: string
  attachmentNames: string[]
  submittedAt: string
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={{ padding: "10px 0", borderBottom: `1px solid ${colors.border}`, width: 140, verticalAlign: "top" }}>
        <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>{label}</Text>
      </td>
      <td style={{ padding: "10px 0", borderBottom: `1px solid ${colors.border}`, verticalAlign: "top" }}>
        <Text style={{ margin: 0, fontSize: 13, color: colors.dark, fontFamily: font }}>{value}</Text>
      </td>
    </tr>
  )
}

export function SupportRequestEmail({
  reference,
  name,
  email,
  businessName,
  topicLabel,
  areaLabel,
  urgency,
  urgencyLabel,
  subject,
  message,
  attachmentNames,
  submittedAt,
}: Props) {
  const pill = urgency ? URGENCY_STYLE[urgency] : null
  const replyHref = `mailto:${email}?subject=${encodeURIComponent(`Re: ${subject} [${reference}]`)}`

  return (
    <EmailLayout preview={`${topicLabel} from ${name}: ${subject}`} orgName="Travada Books">
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        New support request
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {topicLabel} · {reference}
      </Text>
      {pill && urgencyLabel ? (
        <Section style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, fontFamily: font, color: pill.color, backgroundColor: pill.background }}>
            {urgencyLabel}
          </span>
        </Section>
      ) : (
        <Section style={{ marginBottom: 24 }} />
      )}

      <Text style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: colors.dark, lineHeight: "1.4", fontFamily: font }}>
        {subject}
      </Text>
      <Section style={{ backgroundColor: "#F9FAFB", border: `1px solid ${colors.border}`, borderRadius: 6, padding: "16px 20px", marginBottom: 32 }}>
        <Text style={{ margin: 0, fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font, whiteSpace: "pre-wrap" }}>
          {message}
        </Text>
      </Section>

      <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderTop: `1px solid ${colors.border}` }}>
        <tbody>
          <DetailRow label="From" value={name} />
          <DetailRow label="Email" value={<a href={`mailto:${email}`} style={{ color: colors.dark }}>{email}</a>} />
          {businessName ? <DetailRow label="Business" value={businessName} /> : null}
          <DetailRow label="Topic" value={topicLabel} />
          {areaLabel ? <DetailRow label="Product area" value={areaLabel} /> : null}
          {urgencyLabel ? <DetailRow label="Urgency" value={urgencyLabel} /> : null}
          <DetailRow
            label="Attachments"
            value={attachmentNames.length ? attachmentNames.join(", ") : "None"}
          />
          <DetailRow label="Submitted" value={submittedAt} />
          <DetailRow label="Reference" value={reference} />
        </tbody>
      </table>

      <CtaButton href={replyHref}>Reply to {name}</CtaButton>

      <Text style={{ margin: "0 0 8px", fontSize: 12, color: colors.faint, textAlign: "center", fontFamily: font }}>
        Sent from the contact form on travadabooks.com. Replying to this email goes to {email}.
      </Text>
    </EmailLayout>
  )
}
