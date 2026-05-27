import { Document, Page, StyleSheet, View } from "@react-pdf/renderer";
import { format, parseISO, isValid } from "date-fns";
import { PdfxThemeProvider, usePdfxTheme } from "@/lib/pdfx-theme-context";
import { PageHeader } from "@/components/pdfx/page-header/pdfx-page-header";
import { PageFooter } from "@/components/pdfx/page-footer/pdfx-page-footer";
import { Section } from "@/components/pdfx/section/pdfx-section";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/pdfx/table/pdfx-table";
import { Text } from "@/components/pdfx/text/pdfx-text";
import { KeyValue } from "@/components/pdfx/key-value/pdfx-key-value";
import { PdfQRCode } from "@/components/pdfx/qrcode/pdfx-qrcode";
import type { ClassicDocumentData } from "./classic/preview";

function fmtAmt(n: number | null | undefined, currency: string) {
  if (n == null) return `${currency} 0.00`;
  return `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}

function safeFormat(value: string | null | undefined): string {
  if (!value) return "—";
  const d = parseISO(value);
  return isValid(d) ? format(d, "dd/MM/yyyy") : value;
}

function InvoicePdfContent({ data }: { data: ClassicDocumentData }) {
  const theme = usePdfxTheme();
  const { from, customer, currency } = data;

  const styles = StyleSheet.create({
    page: {
      padding: theme.spacing.page.marginTop,
      paddingBottom: theme.spacing.page.marginBottom,
      backgroundColor: theme.colors.background,
    },
    metaRow: {
      flexDirection: "row",
      marginBottom: theme.spacing.sectionGap,
    },
    metaCol: {
      flex: 1,
      paddingRight: 12,
    },
    metaLabel: {
      fontSize: 8,
      fontWeight: "bold" as const,
      color: theme.colors.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    metaValue: {
      fontSize: 9,
      color: theme.colors.foreground,
    },
    dividerCol: {
      width: 1,
      backgroundColor: theme.colors.border,
      marginRight: 12,
    },
  });

  const fromSubtitle = [from.address_line1, from.city, from.email]
    .filter(Boolean)
    .join("  ·  ");

  const customerAddress = [
    customer.address_line1,
    customer.city && customer.zip
      ? `${customer.city} ${customer.zip}`
      : (customer.city ?? customer.zip),
    customer.country,
  ]
    .filter(Boolean)
    .join(", ");

  const customerEmail = customer.billing_email ?? customer.email;
  const documentLabel = data.label ?? "Invoice";
  const secondaryLabel =
    data.secondaryDateLabel?.replace(":", "").trim() ?? "Due Date";

  const summaryItems = [
    { key: "Subtotal", value: fmtAmt(data.subtotal, currency) },
    ...(data.taxAmount
      ? [{ key: "Tax", value: fmtAmt(data.taxAmount, currency) }]
      : []),
    ...(data.discount
      ? [{ key: "Discount", value: `-${fmtAmt(data.discount, currency)}` }]
      : []),
    {
      key: data.label === "QUOTATION" ? "Total" : "Total Due",
      value: fmtAmt(data.total, currency),
      valueStyle: { fontSize: 12, fontWeight: "bold" as const },
      keyStyle: { fontSize: 12, fontWeight: "bold" as const },
    },
  ];

  return (
    <Document title={`${documentLabel} ${data.number ?? ""}`}>
      <Page size="A4" style={styles.page}>
        <PageHeader
          variant="branded"
          title={from.name ?? "Your Business"}
          subtitle={fromSubtitle || undefined}
        />

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel} noMargin>
              {documentLabel} Number
            </Text>
            <Text
              style={{ ...styles.metaValue, fontWeight: "bold", fontSize: 11 }}
              noMargin
            >
              {data.number ?? "—"}
            </Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel} noMargin>
              Date
            </Text>
            <Text style={styles.metaValue} noMargin>
              {safeFormat(data.issueDate)}
            </Text>
          </View>
          {data.secondaryDate && (
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel} noMargin>
                {secondaryLabel}
              </Text>
              <Text style={styles.metaValue} noMargin>
                {safeFormat(data.secondaryDate)}
              </Text>
            </View>
          )}
          <View style={styles.dividerCol} />
          <View style={{ flex: 2 }}>
            <Text style={styles.metaLabel} noMargin>
              {data.customerLabel ?? "Billed To"}
            </Text>
            <Text style={{ ...styles.metaValue, fontWeight: "bold" }} noMargin>
              {customer.name ?? "—"}
            </Text>
            {customerAddress ? (
              <Text
                style={{ ...styles.metaValue, color: theme.colors.mutedForeground }}
                noMargin
              >
                {customerAddress}
              </Text>
            ) : null}
            {customerEmail ? (
              <Text
                style={{ ...styles.metaValue, color: theme.colors.mutedForeground }}
                noMargin
              >
                {customerEmail}
              </Text>
            ) : null}
            {customer.phone ? (
              <Text
                style={{ ...styles.metaValue, color: theme.colors.mutedForeground }}
                noMargin
              >
                {customer.phone}
              </Text>
            ) : null}
          </View>
        </View>

        <Table variant="primary-header">
          <TableHeader>
            <TableRow header>
              <TableCell>Description</TableCell>
              <TableCell align="center">Qty</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data.lineItems ?? []).map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: line items have no stable id
              <TableRow key={i}>
                <TableCell>{item.description}</TableCell>
                <TableCell align="center">{String(item.quantity)}</TableCell>
                <TableCell align="right">{fmtAmt(item.price, currency)}</TableCell>
                <TableCell align="right">
                  {fmtAmt(item.quantity * item.price, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Section noWrap style={{ flexDirection: "row", marginTop: 16 }}>
          <View style={{ flex: 1, paddingRight: 20 }}>
            {data.paymentDetails ? (
              <>
                <Text style={styles.metaLabel} noMargin>
                  Payment Details
                </Text>
                <Text variant="xs" noMargin>
                  {data.paymentDetails}
                </Text>
                {from.tax_id ? (
                  <Text variant="xs" noMargin color="mutedForeground">
                    PIN: {from.tax_id}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
          <View style={{ width: 220 }}>
            <KeyValue size="sm" dividerThickness={1} items={summaryItems} divided />
          </View>
        </Section>

        {data.publicUrl ? (
          <View
            style={{
              position: "absolute",
              bottom: theme.spacing.page.marginBottom + 45,
              right: theme.spacing.page.marginRight,
            }}
          >
            <PdfQRCode
              value={data.publicUrl}
              size={64}
              caption="Scan to view online"
            />
          </View>
        ) : null}

        <PageFooter
          leftText={data.note ?? undefined}
          rightText="Powered by Travada Books"
          sticky
          pagePadding={theme.spacing.page.marginBottom}
        />
      </Page>
    </Document>
  );
}

export function InvoiceSharedPdf({ data }: { data: ClassicDocumentData }) {
  return (
    <PdfxThemeProvider>
      <InvoicePdfContent data={data} />
    </PdfxThemeProvider>
  );
}
