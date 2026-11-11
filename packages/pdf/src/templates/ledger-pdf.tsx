import { Document, Page, Text, View } from "@react-pdf/renderer";
import { PdfImage } from "../components/pdf-image/pdfx-pdf-image";
import { PdfQRCode } from "../components/qrcode/pdfx-qrcode";
import { addressLines, contactLines, formatMoney, getDocumentView, taxIdLine } from "../document-view";
import { fitColumns, fitText, fitsOnOnePage, shareWidths, totalsWidth } from "../pdf-layout";
import type { ClassicDocumentData, LineItem } from "../types";

const INK = "#18181b";
const MUTED = "#52525b";
const RULE = 0.75;
const MARGIN = 40;
const CONTENT = 595 - MARGIN * 2;
const HALF = (CONTENT - 20) / 2;
const SIZE = 9;

function Heading({ children }: { children: string }) {
  return <Text style={{ fontSize: SIZE, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 5 }}>{children}</Text>;
}

function Line({ children, width, color = MUTED }: { children: string; width: number; color?: string }) {
  return (
    <Text style={{ fontSize: SIZE, color, lineHeight: 1.45 }}>{fitText(children, width, SIZE)}</Text>
  );
}

export function LedgerPdf({ data }: { data: ClassicDocumentData }) {
  const { from, customer, currency, lineItems } = data;
  const view = getDocumentView(data);
  const contact = contactLines(from);
  const totalText = `${currency} ${formatMoney(view.total)}`;

  const strip = [
    { label: "Total", value: totalText },
    ...(data.secondaryDate !== undefined
      ? [{ label: view.secondaryDateLabel, value: view.formatDate(data.secondaryDate) }]
      : []),
    { label: `${view.noun} #`, value: data.number ?? "—" },
    { label: `${view.noun} Date`, value: view.formatDate(data.issueDate) },
  ];
  const stripWidths = shareWidths(strip.map((s) => s.value), CONTENT, SIZE, 12);

  const numberColumn = 16;
  const table = fitColumns({
    available: CONTENT,
    reserved: numberColumn,
    fontSize: SIZE,
    padding: 10,
    columns: [
      ...(view.showQty
        ? [
            { key: "qty", header: "Qty", cells: lineItems.map((i) => String(i.quantity)) },
            { key: "rate", header: "Rate", cells: lineItems.map((i) => formatMoney(i.price)) },
          ]
        : []),
      ...(view.showTax
        ? [{ key: "tax", header: "Tax", cells: lineItems.map((i) => `${i.tax_rate}%`) }]
        : []),
      {
        key: "total",
        header: `Total (${currency})`,
        cells: lineItems.map((i) => formatMoney(i.quantity * i.price)),
      },
    ],
  });
  const cell = (key: string, text: string) => (
    <Text style={{ width: table.widths[key], textAlign: "right", paddingLeft: 10 }}>
      {fitText(text, table.widths[key] - 10, table.fontSize)}
    </Text>
  );

  const totalsRows = [
    { label: "Sub Total", value: formatMoney(view.subtotal) },
    ...(view.tax > 0 ? [{ label: "Tax", value: formatMoney(view.tax) }] : []),
    ...(view.discount > 0 ? [{ label: "Discount", value: `- ${formatMoney(view.discount)}` }] : []),
    { label: "Total", value: totalText, strong: true },
  ];
  const totalsBox = totalsWidth(totalsRows.map((r) => r.value), 58, SIZE, 170, CONTENT);
  const notesWidth = CONTENT - totalsBox - 20;
  const stackedTotals = notesWidth < 150;

  // The header stays with the first row, so it is never stranded at the foot
  // of a page, and a row only splits when it cannot fit on one page at all.
  const rowFits = (description: string) =>
    fitsOnOnePage(description, table.descriptionWidth, table.fontSize);
  const tableHeader = (
    <View
          style={{
            flexDirection: "row",
            borderTopWidth: RULE,
            borderBottomWidth: RULE,
            borderColor: INK,
            paddingVertical: 7,
            fontSize: table.fontSize,
            fontFamily: "Helvetica-Bold",
            color: INK,
          }}
        >
          <Text style={{ width: numberColumn }}>#</Text>
          <Text style={{ width: table.descriptionWidth }}>Description</Text>
          {view.showQty ? <Text style={{ width: table.widths.qty, textAlign: "right" }}>Qty</Text> : null}
          {view.showQty ? <Text style={{ width: table.widths.rate, textAlign: "right" }}>Rate</Text> : null}
          {view.showTax ? <Text style={{ width: table.widths.tax, textAlign: "right" }}>Tax</Text> : null}
          <Text style={{ width: table.widths.total, textAlign: "right" }}>{`Total (${currency})`}</Text>
        </View>
  );
  const itemRow = (item: LineItem, i: number) => (

          <View
            key={i}
            wrap={!rowFits(item.description)}
            style={{
              flexDirection: "row",
              borderBottomWidth: RULE,
              borderBottomColor: INK,
              paddingVertical: 6,
              fontSize: table.fontSize,
              lineHeight: 1.35,
            }}
          >
            <Text style={{ width: numberColumn }}>{String(i + 1)}</Text>
            <Text style={{ width: table.descriptionWidth }}>
              {fitText(item.description, table.descriptionWidth, table.fontSize)}
            </Text>
            {view.showQty ? cell("qty", String(item.quantity)) : null}
            {view.showQty ? cell("rate", formatMoney(item.price)) : null}
            {view.showTax ? cell("tax", `${item.tax_rate}%`) : null}
            {cell("total", formatMoney(item.quantity * item.price))}
          </View>
  );

  return (
    <Document title={`${view.label} ${data.number ?? ""}`}>
      <Page size="A4" style={{ padding: MARGIN, fontFamily: "Helvetica", fontSize: SIZE, color: MUTED }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ width: CONTENT - 120 }}>
            {from.logo_url ? (
              <PdfImage
                src={from.logo_url}
                width={160}
                height={40}
                fit="contain"
                position="0% 50%"
                style={{ margin: 0 }}
              />
            ) : (
              <Text style={{ fontSize: 16, lineHeight: 1.25, fontFamily: "Helvetica-Bold", color: INK }}>
                {fitText(from.name ?? "Your Business", CONTENT - 130, 16)}
              </Text>
            )}
          </View>
          <View style={{ width: 120, alignItems: "flex-end" }}>
            <Text style={{ fontSize: 16, lineHeight: 1.25, fontFamily: "Helvetica-Bold", color: INK }}>{view.label}</Text>
            {data.status === "canceled" ? (
              <Text style={{ fontSize: 8, lineHeight: 1.25, fontFamily: "Helvetica-Bold", color: "#dc2626", marginTop: 3 }}>CANCELED</Text>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 20, marginTop: 24, paddingBottom: 14 }}>
          <View style={{ width: HALF }}>
            <Heading>{fitText(from.name ?? "Your Business", HALF, SIZE)}</Heading>
            {addressLines(from).map((line) => (
              <Line key={line} width={HALF}>
                {line}
              </Line>
            ))}
            {taxIdLine(from) ? <Line width={HALF}>{taxIdLine(from) as string}</Line> : null}
          </View>
          {contact.length > 0 ? (
            <View style={{ width: HALF }}>
              <Heading>Contact</Heading>
              {contact.map((line) => (
                <Line key={line} width={HALF}>
                  {line}
                </Line>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", borderTopWidth: RULE, borderTopColor: INK, paddingVertical: 11 }}>
          {strip.map((item, i) => (
            <View key={item.label} style={{ width: stripWidths[i], paddingRight: 8 }}>
              <Text style={{ fontSize: SIZE, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 5, textTransform: "capitalize" }}>
                {item.label}
              </Text>
              <Line width={stripWidths[i] - 8}>{item.value}</Line>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 20, borderTopWidth: RULE, borderTopColor: INK, paddingVertical: 11 }}>
          <View style={{ width: HALF }}>
            <Heading>{view.customerLabel}</Heading>
            <Line width={HALF} color={INK}>
              {customer.name ?? "—"}
            </Line>
            {[...addressLines(customer), ...contactLines(customer)].map((line) => (
              <Line key={line} width={HALF}>
                {line}
              </Line>
            ))}
          </View>
          {view.customFields.length > 0 ? (
            <View style={{ width: HALF }}>
              <Heading>Details</Heading>
              {view.customFields.map((field) => (
                <View key={field.id} style={{ flexDirection: "row", gap: 8, marginBottom: 2 }}>
                  <View style={{ width: (HALF - 8) / 2 }}>
                    <Line width={(HALF - 8) / 2}>{field.label}</Line>
                  </View>
                  <View style={{ width: (HALF - 8) / 2, alignItems: "flex-end" }}>
                    <Text style={{ fontSize: SIZE, color: INK, textAlign: "right", lineHeight: 1.45 }}>
                      {fitText(field.value, (HALF - 8) / 2, SIZE)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View wrap={!rowFits(lineItems[0]?.description ?? "")}>
          {tableHeader}
          {lineItems[0] ? itemRow(lineItems[0], 0) : null}
        </View>
        {lineItems.slice(1).map((item, i) => itemRow(item, i + 1))}

        <View style={{ flexDirection: stackedTotals ? "column" : "row", gap: 20, marginTop: 10 }}>
          {!stackedTotals ? (
            <View style={{ width: notesWidth }}>
              {data.note ? (
                <>
                  <Heading>Notes</Heading>
                  <Line width={notesWidth}>{data.note}</Line>
                </>
              ) : null}
            </View>
          ) : null}
          <View wrap={false} style={{ width: totalsBox, alignSelf: "flex-end" }}>
            {totalsRows.map((row) => (
              <View
                key={row.label}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderBottomWidth: RULE,
                  borderBottomColor: INK,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ fontFamily: "Helvetica-Bold", color: INK }}>{row.label}</Text>
                <Text style={row.strong ? { fontFamily: "Helvetica-Bold", color: INK } : {}}>{row.value}</Text>
              </View>
            ))}
          </View>
          {stackedTotals && data.note ? (
            <View>
              <Heading>Notes</Heading>
              <Line width={CONTENT}>{data.note}</Line>
            </View>
          ) : null}
        </View>

        {data.paymentDetails || data.publicUrl ? (
          <View
            wrap={false}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 20,
              borderTopWidth: RULE,
              borderTopColor: INK,
              marginTop: 24,
              paddingTop: 11,
            }}
          >
            <View style={{ width: CONTENT - 120 }}>
              {data.paymentDetails ? (
                <>
                  <Heading>Payment Info</Heading>
                  <Line width={CONTENT - 120}>{data.paymentDetails}</Line>
                </>
              ) : null}
            </View>
            {data.publicUrl ? (
              <View style={{ width: 100, alignItems: "flex-end" }}>
                <PdfQRCode value={data.publicUrl} size={72} caption="Scan to view online" />
              </View>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
