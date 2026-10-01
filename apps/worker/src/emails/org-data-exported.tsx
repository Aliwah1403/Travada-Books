import React from "react"
import { Text } from "@react-email/components"
import { EmailLayout, OutlinedButton, Hr, formatDate, colors } from "./layout"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  orgName: string
  orgLogoUrl?: string | null
  itemCount: number
  partCount: number
  exportDate: string
  downloadUrls: string[]
  expiresInDays: number
}

export function OrgDataExportedEmail({
  orgName,
  orgLogoUrl,
  itemCount,
  partCount,
  exportDate,
  downloadUrls,
  expiresInDays,
}: Props) {
  const itemLabel = itemCount === 1 ? "1 record" : `${itemCount} records`

  return (
    <EmailLayout
      preview={`Your export of ${orgName}'s data is ready to download`}
      orgName={orgName}
      orgLogoUrl={orgLogoUrl}
    >
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Your data export is ready
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {itemLabel} · Exported {formatDate(exportDate)}
      </Text>

      {downloadUrls.map((url, i) => (
        <OutlinedButton key={url} href={url}>
          {partCount > 1 ? `Download Part ${i + 1} of ${partCount}` : "Download Export"}
        </OutlinedButton>
      ))}

      <Hr style={{ borderColor: colors.border, margin: "8px 0 32px" }} />

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Hi {orgName},
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Your full data export is ready — every customer, invoice, quote, statement, transaction, and file in your
        organisation (including a PDF for every sent invoice, quote, and statement), bundled into{" "}
        {partCount > 1 ? `${partCount} ZIP files` : "a ZIP file"}. Click the button
        {partCount > 1 ? "s" : ""} above to download.
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>
        {partCount > 1 ? "These download links expire" : "This download link expires"} in {expiresInDays} day{expiresInDays === 1 ? "" : "s"}.
      </Text>
    </EmailLayout>
  )
}
