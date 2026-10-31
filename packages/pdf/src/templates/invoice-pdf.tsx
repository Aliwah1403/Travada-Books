import { Document, Page, StyleSheet, Text as PDFText, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { normalizeDocumentTemplate } from "../document-view";
import { resolveDateFnsPattern, formatServerDate } from "../ledger";
import { fitColumns, fitText, fitsOnOnePage, shareWidths, totalsWidth } from "../pdf-layout";
import { BandedPdf } from "./banded-pdf";
import { LedgerPdf } from "./ledger-pdf";
import { MonoPdf } from "./mono-pdf";
import { PdfxThemeProvider, usePdfxTheme } from "../theme-context";
import { PageHeader } from "../components/page-header/pdfx-page-header";
import { PdfImage } from "../components/pdf-image/pdfx-pdf-image";
import { Section } from "../components/section/pdfx-section";
import { Text } from "../components/text/pdfx-text";
import { PdfQRCode } from "../components/qrcode/pdfx-qrcode";
import { normalizeCustomFields } from "../custom-fields";
import type { ClassicDocumentData, LineItem } from "../types";

function fmtAmt(n: number | null | undefined, currency: string, locale?: string) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function InvoicePdfContent({ data }: { data: ClassicDocumentData }) {
  const theme = usePdfxTheme();
  const { from, customer, currency } = data;
  const datePattern = resolveDateFnsPattern(data.dateFormat);
  const safeFormat = (value: string | null | undefined) =>
    formatServerDate(value, datePattern);
  // NULL (quotes, and invoices saved before this setting existed) must
  // render exactly as this template always has: Qty shown, no Tax column —
  // see ClassicDocumentData.showTaxColumn/showQtyColumn.
  const showQty = data.showQtyColumn ?? true;
  const showTax = data.showTaxColumn ?? false;

  const contentWidth = 595 - theme.spacing.page.marginTop * 2;
  const customFieldColumn = (contentWidth / 2 - 12 - 8) / 2;

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
    customFieldsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: theme.spacing.sectionGap,
    },
    customFieldPair: {
      width: "50%",
      paddingRight: 12,
      marginBottom: 4,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    customFieldLabel: {
      fontSize: 9,
      color: theme.colors.mutedForeground,
      width: customFieldColumn,
    },
    customFieldValue: {
      fontSize: 9,
      color: theme.colors.foreground,
      fontWeight: "medium" as const,
      textAlign: "right" as const,
      width: customFieldColumn,
    },
  });

  const visibleCustomFields = normalizeCustomFields(data.customFields ?? []);

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
  ];
  const totalLabel = data.label === "QUOTATION" ? "Total" : "Total Due";
  const totalValue = fmtAmt(data.total, currency);
  // Total prints larger than the rows above it, so it sets the block width.
  const summaryWidth = Math.max(
    totalsWidth(summaryItems.map((i) => i.value), 60, 10, 220, contentWidth),
    totalsWidth([totalValue], 70, 12, 220, contentWidth),
  );

  const lineItems = data.lineItems ?? [];
  const table = fitColumns({
    available: contentWidth,
    fontSize: theme.typography.body.fontSize,
    padding: 20,
    headerCharWidth: 8,
    columns: [
      ...(showQty
        ? [
            { key: "qty", header: "Qty", cells: lineItems.map((i) => String(i.quantity)) },
            {
              key: "price",
              header: "Unit Price",
              cells: lineItems.map((i) => fmtAmt(i.price, currency)),
            },
          ]
        : []),
      ...(showTax
        ? [{ key: "tax", header: "Tax", cells: lineItems.map((i) => `${i.tax_rate}%`) }]
        : []),
      {
        key: "amount",
        header: "Amount",
        cells: lineItems.map((i) => fmtAmt(i.quantity * i.price, currency)),
      },
    ],
  });
  const metaValues = [
    data.number ?? "—",
    safeFormat(data.issueDate),
    ...(data.secondaryDate ? [safeFormat(data.secondaryDate)] : []),
  ];
  // The left 3/5 of the row; the customer block takes the rest.
  const metaArea = (contentWidth - 13) * 0.6;
  const metaWidths = shareWidths(metaValues, metaArea, 11, 12);
  const customerWidth = contentWidth - metaArea - 13;

  // The header stays with the first row, so it is never stranded at the foot
  // of a page, and a row only splits when it cannot fit on one page at all.
  const rowFits = (description: string) =>
    fitsOnOnePage(description, table.descriptionWidth - 20, table.fontSize);
  const headerCell = (text: string, width: number, align?: "center" | "right") => (
    <PDFText
      style={{
        width,
        paddingHorizontal: 10,
        fontSize: 10,
        color: theme.colors.primaryForeground,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        textAlign: align,
      }}
    >
      {text}
    </PDFText>
  );
  const bodyCell = (text: string, width: number, align?: "center" | "right") => (
    <PDFText
      style={{
        width,
        paddingHorizontal: 10,
        fontSize: table.fontSize,
        lineHeight: 1.25,
        color: theme.colors.foreground,
        textAlign: align,
      }}
    >
      {fitText(text, width - 20, table.fontSize)}
    </PDFText>
  );
  const tableHeader = (
    <View style={{ flexDirection: "row", backgroundColor: theme.colors.primary, paddingVertical: 6 }}>
      {headerCell("Description", table.descriptionWidth)}
      {showQty && headerCell("Qty", table.widths.qty, "center")}
      {showQty && headerCell("Unit Price", table.widths.price, "right")}
      {showTax && headerCell("Tax", table.widths.tax, "right")}
      {headerCell("Amount", table.widths.amount, "right")}
    </View>
  );
  const itemRow = (item: LineItem, i: number) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: line items have no stable id
    <View
      key={i}
      wrap={!rowFits(item.description)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.border,
      }}
    >
      {bodyCell(item.description, table.descriptionWidth)}
      {showQty && bodyCell(String(item.quantity), table.widths.qty, "center")}
      {showQty && bodyCell(fmtAmt(item.price, currency), table.widths.price, "right")}
      {showTax && bodyCell(`${item.tax_rate}%`, table.widths.tax, "right")}
      {bodyCell(fmtAmt(item.quantity * item.price, currency), table.widths.amount, "right")}
    </View>
  );

  return (
    <Document title={`${documentLabel} ${data.number ?? ""}`}>
      <Page size="A4" style={styles.page}>
        {from.logo_url ? (
          <PageHeader
            variant="logo-left"
            logo={
              <PdfImage
                src={from.logo_url}
                width={140}
                height={48}
                fit="contain"
                style={{ margin: 0 }}
              />
            }
            title={from.name ?? "Your Business"}
            subtitle={fitText(fromSubtitle, contentWidth - 160, 11) || undefined}
          />
        ) : (
          <PageHeader
            variant="simple"
            title={from.name ?? "Your Business"}
            subtitle={fitText(fromSubtitle, contentWidth, 11) || undefined}
          />
        )}

        {data.status === "canceled" && (
          <Text
            style={{
              fontSize: 10,
              fontWeight: "bold" as const,
              color: theme.colors.destructive,
              letterSpacing: 1,
              marginBottom: 8,
            }}
            noMargin
          >
            CANCELED
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={{ ...styles.metaCol, flex: undefined, width: metaWidths[0] }}>
            <Text style={styles.metaLabel} noMargin>
              {documentLabel} Number
            </Text>
            <Text
              style={{ ...styles.metaValue, fontWeight: "bold", fontSize: 11 }}
              noMargin
            >
              {fitText(data.number ?? "—", metaWidths[0] - 12, 11)}
            </Text>
          </View>
          <View style={{ ...styles.metaCol, flex: undefined, width: metaWidths[1] }}>
            <Text style={styles.metaLabel} noMargin>
              Date
            </Text>
            <Text style={styles.metaValue} noMargin>
              {safeFormat(data.issueDate)}
            </Text>
          </View>
          {data.secondaryDate && (
            <View style={{ ...styles.metaCol, flex: undefined, width: metaWidths[2] }}>
              <Text style={styles.metaLabel} noMargin>
                {secondaryLabel}
              </Text>
              <Text style={styles.metaValue} noMargin>
                {safeFormat(data.secondaryDate)}
              </Text>
            </View>
          )}
          <View style={styles.dividerCol} />
          <View style={{ width: customerWidth }}>
            <Text style={styles.metaLabel} noMargin>
              {data.customerLabel ?? "Billed To"}
            </Text>
            <Text style={{ ...styles.metaValue, fontWeight: "bold" }} noMargin>
              {fitText(customer.name ?? "—", customerWidth, 9)}
            </Text>
            {customerAddress ? (
              <Text
                style={{ ...styles.metaValue, color: theme.colors.mutedForeground }}
                noMargin
              >
                {fitText(customerAddress, customerWidth, 9)}
              </Text>
            ) : null}
            {customerEmail ? (
              <Text
                style={{ ...styles.metaValue, color: theme.colors.mutedForeground }}
                noMargin
              >
                {fitText(customerEmail, customerWidth, 9)}
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

        {visibleCustomFields.length > 0 ? (
          <View style={styles.customFieldsRow}>
            {visibleCustomFields.map((field) => (
              <View key={field.id} style={styles.customFieldPair}>
                <Text style={styles.customFieldLabel} noMargin>
                  {fitText(field.label, customFieldColumn, 9)}
                </Text>
                <Text style={styles.customFieldValue} noMargin>
                  {fitText(field.value, customFieldColumn, 9)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View wrap={!rowFits(lineItems[0]?.description ?? "")}>
          {tableHeader}
          {lineItems[0] ? itemRow(lineItems[0], 0) : null}
        </View>
        {lineItems.slice(1).map((item, i) => itemRow(item, i + 1))}

        <Section noWrap style={{ flexDirection: "row", marginTop: 16 }}>
          <View style={{ marginLeft: "auto", width: summaryWidth }}>
            {summaryItems.map((item) => (
              <View
                key={item.key}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 8,
                  paddingVertical: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <PDFText style={{ fontSize: 10, color: theme.colors.mutedForeground }}>{item.key}</PDFText>
                <PDFText style={{ fontSize: 10, color: theme.colors.foreground }}>{item.value}</PDFText>
              </View>
            ))}
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 4 }}
            >
              <PDFText style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: theme.colors.foreground }}>{totalLabel}</PDFText>
              <PDFText style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: theme.colors.foreground }}>{totalValue}</PDFText>
            </View>
          </View>
        </Section>

        {(data.paymentDetails || data.note) ? (
          <Section noWrap style={{ marginTop: 16 }}>
            {data.paymentDetails ? (
              <View style={{ marginBottom: data.note ? 8 : 0 }}>
                <Text style={styles.metaLabel} noMargin>
                  Payment Details
                </Text>
                <Text variant="xs" noMargin>
                  {fitText(data.paymentDetails, contentWidth, 10)}
                </Text>
                {from.tax_id ? (
                  <Text variant="xs" noMargin color="mutedForeground">
                    PIN: {from.tax_id}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {data.note ? (
              <View>
                <Text style={styles.metaLabel} noMargin>
                  Notes
                </Text>
                <Text variant="xs" noMargin style={{ whiteSpace: "pre-wrap" } as Style}>
                  {fitText(data.note, contentWidth, 10)}
                </Text>
              </View>
            ) : null}
          </Section>
        ) : null}

        {/* Footer separator line */}
        <View
          style={{
            position: "absolute",
            bottom: 28,
            left: theme.spacing.page.marginTop,
            right: theme.spacing.page.marginTop,
            height: 0.5,
            backgroundColor: theme.colors.border,
          }}
        />

        {/* QR code at the bottom-right. In the flow rather than pinned, so a
            full page pushes it on instead of printing it over the notes. */}
        {data.publicUrl ? (
          <View
            wrap={false}
            style={{
              marginTop: "auto",
              paddingTop: 12,
              alignItems: "flex-end",
            }}
          >
            <PdfQRCode
              value={data.publicUrl}
              size={72}
              caption="Scan to view online"
            />
          </View>
        ) : null}
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

// The one entry point for invoice and quote PDFs: picks the layout saved on
// the document. Every download, email attachment and export goes through here.
export function InvoicePdf({ data }: { data: ClassicDocumentData }) {
  switch (normalizeDocumentTemplate(data.template)) {
    case "ledger":
      return (
        <PdfxThemeProvider>
          <LedgerPdf data={data} />
        </PdfxThemeProvider>
      );
    case "banded":
      return (
        <PdfxThemeProvider>
          <BandedPdf data={data} />
        </PdfxThemeProvider>
      );
    case "mono":
      return (
        <PdfxThemeProvider>
          <MonoPdf data={data} />
        </PdfxThemeProvider>
      );
    default:
      return <InvoiceSharedPdf data={data} />;
  }
}
