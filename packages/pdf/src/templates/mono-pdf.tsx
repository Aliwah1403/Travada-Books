import { Document, Page, Text, View } from "@react-pdf/renderer";
import { PdfImage } from "../components/pdf-image/pdfx-pdf-image";
import { PdfQRCode } from "../components/qrcode/pdfx-qrcode";
import { addressLines, contactLines, formatMoney, getDocumentView, taxIdLine } from "../document-view";
import { COURIER_CHAR, fitColumns, fitText, fitsOnOnePage, totalsWidth } from "../pdf-layout";
import type { ClassicDocumentData, LineItem } from "../types";

const INK = "#18181b";
const MUTED = "#52525b";
const RULE_COLOR = "#d4d4d8";
const MARGIN = 46;
const CONTENT = 595 - MARGIN * 2;
const SIZE = 8.5;
const LABEL_SIZE = 9.5;
const RAIL = 96;
const RAIL_GAP = 14;
const MAIN = CONTENT - RAIL - RAIL_GAP;

const fit = (text: string, width: number, size = SIZE) => fitText(text, width, size, COURIER_CHAR);

function Label({ children, width }: { children: string; width: number }) {
  return (
    <Text style={{ fontSize: LABEL_SIZE, lineHeight: 1.25, color: INK, textTransform: "uppercase", marginBottom: 6 }}>
      {fit(children, width, LABEL_SIZE)}
    </Text>
  );
}

export function MonoPdf({ data }: { data: ClassicDocumentData }) {
  const { from, customer, currency, lineItems } = data;
  const view = getDocumentView(data);
  const footer = [from.name, from.email].filter(Boolean).join("  •  ");

  const table = fitColumns({
    available: MAIN,
    fontSize: SIZE,
    padding: 10,
    charWidth: COURIER_CHAR,
    headerCharWidth: LABEL_SIZE * COURIER_CHAR,
    columns: [
      ...(view.showQty
        ? [
            { key: "rate", header: "Rate", cells: lineItems.map((i) => formatMoney(i.price)) },
            { key: "qty", header: "Qty", cells: lineItems.map((i) => String(i.quantity)) },
          ]
        : []),
      ...(view.showTax
        ? [{ key: "tax", header: "Tax", cells: lineItems.map((i) => `${i.tax_rate}%`) }]
        : []),
      { key: "amount", header: "Amount", cells: lineItems.map((i) => formatMoney(i.quantity * i.price)) },
    ],
  });
  const cell = (key: string, text: string) => (
    <Text style={{ width: table.widths[key], textAlign: "right", paddingLeft: 10 }}>
      {fit(text, table.widths[key] - 10, table.fontSize)}
    </Text>
  );
  const header = (key: string, text: string) => (
    <Text style={{ width: table.widths[key], textAlign: "right" }}>{text}</Text>
  );

  const totalsRows = [
    { label: "Subtotal", value: formatMoney(view.subtotal) },
    ...(view.tax > 0 ? [{ label: "Tax", value: formatMoney(view.tax) }] : []),
    ...(view.discount > 0 ? [{ label: "Discount", value: `- ${formatMoney(view.discount)}` }] : []),
  ];
  const totalText = `${currency} ${formatMoney(view.total)}`;
  // TOTAL prints larger than the rows above it, so it decides the block width.
  const totalsBox = Math.max(
    totalsWidth(totalsRows.map((r) => r.value), 60, SIZE, 190, MAIN, COURIER_CHAR),
    totalsWidth([totalText], 44, 11, 190, MAIN, COURIER_CHAR),
  );
  const totalSize = Math.min(11, (totalsBox - 44) / (totalText.length * COURIER_CHAR));

  // The header stays with the first row, so it is never stranded at the foot
  // of a page, and a row only splits when it cannot fit on one page at all.
  const rowFits = (description: string) =>
    fitsOnOnePage(description, table.descriptionWidth, table.fontSize, COURIER_CHAR);
  const tableHeader = (
    <View
              style={{ flexDirection: "row", fontSize: LABEL_SIZE, color: INK, textTransform: "uppercase", marginBottom: 6 }}
            >
              <Text style={{ width: table.descriptionWidth }}>Description</Text>
              {view.showQty ? header("rate", "Rate") : null}
              {view.showQty ? header("qty", "Qty") : null}
              {view.showTax ? header("tax", "Tax") : null}
              {header("amount", "Amount")}
            </View>
  );
  const itemRow = (item: LineItem, i: number) => (

              <View key={i} wrap={!rowFits(item.description)} style={{ flexDirection: "row", paddingVertical: 5, fontSize: table.fontSize }}>
                <Text style={{ width: table.descriptionWidth }}>
                  {fit(item.description, table.descriptionWidth, table.fontSize)}
                </Text>
                {view.showQty ? cell("rate", formatMoney(item.price)) : null}
                {view.showQty ? cell("qty", String(item.quantity)) : null}
                {view.showTax ? cell("tax", `${item.tax_rate}%`) : null}
                {cell("amount", formatMoney(item.quantity * item.price))}
              </View>
  );

  return (
    <Document title={`${view.label} ${data.number ?? ""}`}>
      <Page size="A4" style={{ padding: MARGIN, fontFamily: "Courier", fontSize: SIZE, color: MUTED, lineHeight: 1.4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 20 }}>
          <View style={{ width: 130 }}>
            {from.logo_url ? (
              <PdfImage
                src={from.logo_url}
                width={120}
                height={40}
                fit="contain"
                position="0% 50%"
                style={{ margin: 0 }}
              />
            ) : (
              <View
                style={{ width: 36, height: 36, backgroundColor: INK, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#ffffff", fontSize: 11, lineHeight: 1.25, fontFamily: "Courier-Bold" }}>
                  {(from.name ?? "TB").slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={{ width: CONTENT - 150, alignItems: "flex-end" }}>
            <Text style={{ color: INK, letterSpacing: 2, textTransform: "uppercase", textAlign: "right", marginBottom: 8 }}>
              {fit(from.name ?? "Your Business", CONTENT - 150, 11)}
            </Text>
            {[...addressLines(from), ...contactLines(from), ...(taxIdLine(from) ? [taxIdLine(from) as string] : [])].map(
              (line) => (
                <Text key={line} style={{ textAlign: "right" }}>
                  {fit(line, CONTENT - 150)}
                </Text>
              ),
            )}
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 20, marginTop: 30 }}>
          <View style={{ width: CONTENT - 200 }}>
            <Label width={CONTENT - 200}>{view.customerLabel}</Label>
            <Text>{fit(customer.name ?? "—", CONTENT - 200)}</Text>
            {addressLines(customer).map((line) => (
              <Text key={line}>{fit(line, CONTENT - 200)}</Text>
            ))}
            {contactLines(customer).length > 0 ? <View style={{ height: 7 }} /> : null}
            {contactLines(customer).map((line) => (
              <Text key={line}>{fit(line, CONTENT - 200)}</Text>
            ))}
          </View>
          <View style={{ width: 180, alignItems: "flex-end" }}>
            <Text style={{ fontSize: 15, lineHeight: 1.25, fontFamily: "Courier-Bold", color: INK }}>{view.label}</Text>
            {data.status === "canceled" ? (
              <Text style={{ fontSize: 8, lineHeight: 1.25, fontFamily: "Courier-Bold", color: "#dc2626", marginTop: 3 }}>CANCELED</Text>
            ) : null}
            <Text style={{ fontSize: LABEL_SIZE, lineHeight: 1.25, color: INK, textTransform: "uppercase", marginTop: 8 }}>
              {`${view.noun} Number`}
            </Text>
            <Text style={{ textAlign: "right" }}>{fit(data.number ?? "—", 180)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: RAIL_GAP, marginTop: 30 }}>
          <View style={{ width: RAIL }}>
            <View style={{ marginBottom: 12 }}>
              <Label width={RAIL}>{`${view.noun} Date`}</Label>
              <Text>{view.formatDate(data.issueDate)}</Text>
            </View>
            {data.secondaryDate !== undefined ? (
              <View style={{ marginBottom: 12 }}>
                <Label width={RAIL}>{view.secondaryDateLabel}</Label>
                <Text>{view.formatDate(data.secondaryDate)}</Text>
              </View>
            ) : null}
            {view.customFields.map((field) => (
              <View key={field.id} style={{ marginBottom: 12 }}>
                <Label width={RAIL}>{field.label}</Label>
                <Text>{fit(field.value, RAIL)}</Text>
              </View>
            ))}
          </View>

          <View style={{ width: MAIN }}>
            <View wrap={!rowFits(lineItems[0]?.description ?? "")}>
              {tableHeader}
              {lineItems[0] ? itemRow(lineItems[0], 0) : null}
            </View>
            {lineItems.slice(1).map((item, i) => itemRow(item, i + 1))}

            <View style={{ borderTopWidth: 0.5, borderTopColor: RULE_COLOR, marginTop: 7, paddingTop: 12 }}>
              <View wrap={false} style={{ width: totalsBox, alignSelf: "flex-end" }}>
                {totalsRows.map((row) => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                    <Text style={{ color: INK }}>{row.label}</Text>
                    <Text>{row.value}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 5, color: INK }}>
                  <Text style={{ fontSize: LABEL_SIZE, lineHeight: 1.25 }}>TOTAL</Text>
                  <Text style={{ fontSize: totalSize, lineHeight: 1.25 }}>{totalText}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {data.paymentDetails ? (
          <View style={{ marginTop: 26 }}>
            <Label width={CONTENT}>Payment Details</Label>
            <Text>{fit(data.paymentDetails, CONTENT)}</Text>
          </View>
        ) : null}

        {data.note ? (
          <View style={{ marginTop: 20 }}>
            <Label width={CONTENT}>Notes</Label>
            <Text>{fit(data.note, CONTENT)}</Text>
          </View>
        ) : null}

        <View
          wrap={false}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            borderTopWidth: 0.5,
            borderTopColor: RULE_COLOR,
            marginTop: 26,
            paddingTop: 10,
          }}
        >
          <View style={{ width: data.publicUrl ? CONTENT - 76 : CONTENT }}>
            <Text>{fit(footer, data.publicUrl ? CONTENT - 76 : CONTENT)}</Text>
          </View>
          {data.publicUrl ? <PdfQRCode value={data.publicUrl} size={60} /> : null}
        </View>
      </Page>
    </Document>
  );
}
