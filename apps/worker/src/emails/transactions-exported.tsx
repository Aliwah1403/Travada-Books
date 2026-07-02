import React from "react"
import { Text } from "@react-email/components"
import { EmailLayout, CtaButton, Hr, formatDate, colors } from "./layout"

const font = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  orgName: string
  orgLogoUrl?: string | null
  rowCount: number
  format: "csv" | "xlsx"
  exportDate: string
  downloadUrl: string
}

export function TransactionsExportedEmail({ orgName, orgLogoUrl, rowCount, format, exportDate, downloadUrl }: Props) {
  const formatLabel = format === "xlsx" ? "Excel (XLSX)" : "CSV"
  const fileLabel = rowCount === 1 ? "1 transaction" : `${rowCount} transactions`

  return (
    <EmailLayout
      preview={`Your export of ${fileLabel} is ready to download`}
      orgName={orgName}
      orgLogoUrl={orgLogoUrl}
    >
      <Text style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: colors.dark, letterSpacing: "-0.02em", textAlign: "center", fontFamily: font }}>
        Your export is ready
      </Text>
      <Text style={{ margin: "0 0 40px", fontSize: 13, color: colors.muted, textAlign: "center", fontFamily: font }}>
        {fileLabel} · {formatLabel} · Exported {formatDate(exportDate)}
      </Text>

      <CtaButton href={downloadUrl}>Download Export</CtaButton>

      <Hr style={{ borderColor: colors.border, margin: "8px 0 32px" }} />

      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Hi {orgName},
      </Text>
      <Text style={{ margin: "0 0 16px", fontSize: 14, color: colors.body, lineHeight: "1.6", fontFamily: font }}>
        Your transaction export of <strong style={{ color: colors.dark }}>{fileLabel}</strong> is ready. Click the button above to download your {formatLabel} file.
        {" "}If the export includes receipts or attachments, they are bundled in the same ZIP file.
      </Text>
      <Text style={{ margin: 0, fontSize: 13, color: colors.muted, fontFamily: font }}>
        This download link expires in 7 days.
      </Text>
    </EmailLayout>
  )
}
