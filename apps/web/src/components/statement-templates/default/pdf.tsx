import { Document, Page, View, StyleSheet } from "@react-pdf/renderer"
import { PdfxThemeProvider, usePdfxTheme } from "@/lib/pdfx-theme-context"
import { PageHeader } from "@/components/pdfx/page-header/pdfx-page-header"
import { PageFooter } from "@/components/pdfx/page-footer/pdfx-page-footer"
import { Section } from "@/components/pdfx/section/pdfx-section"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/pdfx/table/pdfx-table"
import { Text } from "@/components/pdfx/text/pdfx-text"
import { KeyValue } from "@/components/pdfx/key-value/pdfx-key-value"
import { PdfImage } from "@/components/pdfx/pdf-image/pdfx-pdf-image"
import type { Participant } from "@/components/invoice-templates/classic/preview"

export type LedgerEntry = {
  date: string
  description: string
  invoiceNumber: string | null
  debit: number
  credit: number
  balance: number
}

export type StatementPdfData = {
  currency: string
  from: Participant
  customer: Participant
  statementDate: string
  dateFrom: string
  dateTo: string
  entries: LedgerEntry[]
  notes: string | null
}

function fmtAmt(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
}

function StatementPdfContent({ data }: { data: StatementPdfData }) {
  const theme = usePdfxTheme()

  const { currency, from, customer, statementDate, dateFrom, dateTo, entries, notes } = data
  const totalDebits = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredits = entries.reduce((s, e) => s + e.credit, 0)
  const closingBalance = totalDebits - totalCredits
  const customerEmail = customer.billing_email ?? customer.email

  const styles = StyleSheet.create({
    page: {
      padding: theme.spacing.page.marginTop,
      paddingBottom: theme.spacing.page.marginBottom,
      backgroundColor: theme.colors.background,
    },
    addressCol: { flex: 1, paddingRight: 12 },
  })

  return (
    <Document title={`Statement — ${customer.name ?? "Customer"}`}>
      <Page size="A4" style={styles.page}>
        <PageHeader
          variant="logo-left"
          logo={
            from.logo_url ? (
              <PdfImage src={from.logo_url} style={{ margin: 0, height: 36, width: "auto" }} />
            ) : undefined
          }
          title={from.name ?? "Your Business"}
          rightText="STATEMENT"
          rightSubText={statementDate}
          style={{ marginBottom: 8 }}
        />

        {/* From / Prepared For / Period */}
        <Section noWrap style={{ flexDirection: "row", marginBottom: 4 }}>
          <View style={styles.addressCol}>
            <Text style={{ fontSize: 8, fontWeight: "bold", marginBottom: 2 }} color="mutedForeground" transform="uppercase" noMargin>
              From
            </Text>
            {from.address_line1 && <Text noMargin variant="xs">{from.address_line1}</Text>}
            {from.city && <Text noMargin variant="xs">{from.city}</Text>}
            {from.email && <Text noMargin variant="xs">{from.email}</Text>}
          </View>

          <View style={styles.addressCol}>
            <Text style={{ fontSize: 8, fontWeight: "bold", marginBottom: 2 }} color="mutedForeground" transform="uppercase" noMargin>
              Prepared For
            </Text>
            <Text noMargin variant="xs" weight="semibold">{customer.name ?? "—"}</Text>
            {customer.address_line1 && <Text noMargin variant="xs">{customer.address_line1}</Text>}
            {(customer.city || customer.zip) && (
              <Text noMargin variant="xs">{[customer.city, customer.zip].filter(Boolean).join(" ")}</Text>
            )}
            {customer.country && <Text noMargin variant="xs">{customer.country}</Text>}
            {customerEmail && <Text noMargin variant="xs">{customerEmail}</Text>}
          </View>

          <View style={{ flex: 0.8 }}>
            <Text style={{ fontSize: 8, fontWeight: "bold", marginBottom: 2 }} color="mutedForeground" transform="uppercase" noMargin>
              Period
            </Text>
            <KeyValue
              size="sm"
              items={[
                { key: "Date", value: statementDate },
                { key: "From", value: dateFrom },
                { key: "To", value: dateTo },
                { key: "Currency", value: currency },
              ]}
            />
          </View>
        </Section>

        {/* Ledger table */}
        <Table variant="grid" zebraStripe>
          <TableHeader>
            <TableRow header>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Invoice #</TableCell>
              <TableCell align="right">Charges</TableCell>
              <TableCell align="right">Payments</TableCell>
              <TableCell align="right">Balance</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening balance */}
            <TableRow>
              <TableCell>—</TableCell>
              <TableCell>Opening balance</TableCell>
              <TableCell>—</TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right">—</TableCell>
              <TableCell align="right">{fmtAmt(0, currency)}</TableCell>
            </TableRow>
            {entries.map((entry, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: ledger entries have no stable id
              <TableRow key={i}>
                <TableCell>{entry.date}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>{entry.invoiceNumber ?? "—"}</TableCell>
                <TableCell align="right">{entry.debit > 0 ? fmtAmt(entry.debit, currency) : "—"}</TableCell>
                <TableCell align="right">{entry.credit > 0 ? fmtAmt(entry.credit, currency) : "—"}</TableCell>
                <TableCell align="right">{fmtAmt(entry.balance, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Summary */}
        <Section noWrap style={{ flexDirection: "row", marginTop: 12 }}>
          <View style={{ marginLeft: "auto", width: 240 }}>
            <KeyValue
              size="sm"
              dividerThickness={1}
              items={[
                { key: "Total charges", value: fmtAmt(totalDebits, currency) },
                { key: "Total payments", value: fmtAmt(totalCredits, currency) },
                {
                  key: "Closing balance",
                  value: fmtAmt(closingBalance, currency),
                  keyStyle: { fontSize: 12, fontWeight: "bold" as const },
                  valueStyle: { fontSize: 12, fontWeight: "bold" as const },
                },
              ]}
              divided
            />
          </View>
        </Section>

        <PageFooter
          leftText={notes ?? undefined}
          rightText="Powered by Travada Books"
          sticky
          pagePadding={theme.spacing.page.marginBottom}
        />
      </Page>
    </Document>
  )
}

export function StatementPdf({ data }: { data: StatementPdfData }) {
  return (
    <PdfxThemeProvider>
      <StatementPdfContent data={data} />
    </PdfxThemeProvider>
  )
}
