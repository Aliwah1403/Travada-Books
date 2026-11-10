import { Document, Page, Text, View } from "@react-pdf/renderer";
import { PdfImage } from "../components/pdf-image/pdfx-pdf-image";
import { PdfQRCode } from "../components/qrcode/pdfx-qrcode";
import { addressLines, contactLines, formatMoney, getDocumentView, taxIdLine } from "../document-view";
import { fitColumns, fitText, fitsOnOnePage, totalsWidth } from "../pdf-layout";
import type { ClassicDocumentData, LineItem, Participant } from "../types";

const INK = "#18181b";
const MUTED = "#52525b";
const BAND = "#f4f4f5";
const RULE_COLOR = "#d4d4d8";
const MARGIN = 40;
const CONTENT = 595 - MARGIN * 2;
const SIZE = 9;

function Party({ title, party, width }: { title: string; party: Participant; width: number }) {
  const lines = [
    addressLines(party).join(", "),
    contactLines(party).join(" | "),
    taxIdLine(party) ?? "",
  ].filter(Boolean);
  return (
    <View style={{ width }}>
      <Text style={{ fontSize: 11, lineHeight: 1.25, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 3 }}>{title}</Text>
      <Text >{fitText(party.name ?? "—", width, SIZE)}</Text>
      {lines.length > 0 ? (
        <View style={{ marginTop: 7 }}>
          {lines.map((line) => (
            <Text key={line} >
              {fitText(line, width, SIZE)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function BandedPdf({ data }: { data: ClassicDocumentData }) {
  const { from, customer, currency, lineItems } = data;
  const view = getDocumentView(data);
  const money = (n: number) => `${currency} ${formatMoney(n)}`;
  const partyWidth = (CONTENT - 44) / 2;

  const refColumn = 26;
  const table = fitColumns({
    available: CONTENT,
    reserved: refColumn,
    fontSize: SIZE,
    padding: 12,
    columns: [
      ...(view.showQty
        ? [
            { key: "qty", header: "Qty", cells: lineItems.map((i) => String(i.quantity)) },
            { key: "price", header: "Unit Price", cells: lineItems.map((i) => money(i.price)) },
          ]
        : []),
      ...(view.showTax
        ? [{ key: "tax", header: "Tax", cells: lineItems.map((i) => `${i.tax_rate}%`) }]
        : []),
      { key: "amount", header: "Amount", cells: lineItems.map((i) => money(i.quantity * i.price)) },
    ],
  });
  const cell = (key: string, text: string) => (
    <Text style={{ width: table.widths[key], textAlign: "center", paddingHorizontal: 6 }}>
      {fitText(text, table.widths[key] - 12, table.fontSize)}
    </Text>
  );
  const header = (key: string, text: string) => (
    <Text style={{ width: table.widths[key], textAlign: "center" }}>{text}</Text>
  );

  const totalsRows = [
    { label: "Sub Total", value: money(view.subtotal) },
    ...(view.tax > 0 ? [{ label: "Taxes", value: money(view.tax) }] : []),
    ...(view.discount > 0 ? [{ label: "Discount", value: `- ${money(view.discount)}` }] : []),
  ];
  const totalText = money(view.total);
  const totalsBox = totalsWidth(
    [...totalsRows.map((r) => r.value), totalText],
    72,
    SIZE,
    190,
    CONTENT,
  );
  const notesWidth = CONTENT - totalsBox - 20;
  const stackedTotals = notesWidth < 150;
  const footerItems = [addressLines(from).join(", "), from.phone, from.email].filter(
    (item): item is string => Boolean(item),
  );

  const notes = data.note ? (
    <View style={{ width: stackedTotals ? CONTENT : notesWidth }}>
      <Text style={{ fontFamily: "Helvetica-Bold", color: INK, marginBottom: 5 }}>Notes</Text>
      <Text style={{ fontFamily: "Helvetica-Oblique" }}>
        {fitText(data.note, stackedTotals ? CONTENT : notesWidth, SIZE)}
      </Text>
    </View>
  ) : (
    <View style={{ width: stackedTotals ? 0 : notesWidth }} />
  );

  // The header stays with the first row, so it is never stranded at the foot
  // of a page, and a row only splits when it cannot fit on one page at all.
  const rowFits = (description: string) =>
    fitsOnOnePage(description, table.descriptionWidth, table.fontSize);
  const tableHeader = (
    <View
            style={{
              flexDirection: "row",
              borderTopWidth: 0.5,
              borderTopColor: RULE_COLOR,
              paddingVertical: 8,
              fontFamily: "Helvetica-Bold",
              color: INK,
              fontSize: table.fontSize,
            }}
          >
            <Text style={{ width: refColumn, textAlign: "center" }}>Ref</Text>
            <Text style={{ width: table.descriptionWidth, paddingHorizontal: 6 }}>Description</Text>
            {view.showQty ? header("qty", "Qty") : null}
            {view.showQty ? header("price", "Unit Price") : null}
            {view.showTax ? header("tax", "Tax") : null}
            {header("amount", "Amount")}
          </View>
  );
  const itemRow = (item: LineItem, i: number) => (

            <View
              key={i}
              wrap={!rowFits(item.description)}
              style={{
                flexDirection: "row",
                backgroundColor: i % 2 === 0 ? BAND : undefined,
                paddingVertical: 6.5,
                fontSize: table.fontSize,
                lineHeight: 1.35,
              }}
            >
              <Text style={{ width: refColumn, textAlign: "center" }}>{String(i + 1)}</Text>
              <Text style={{ width: table.descriptionWidth, paddingHorizontal: 6 }}>
                {fitText(item.description, table.descriptionWidth - 12, table.fontSize)}
              </Text>
              {view.showQty ? cell("qty", String(item.quantity)) : null}
              {view.showQty ? cell("price", money(item.price)) : null}
              {view.showTax ? cell("tax", `${item.tax_rate}%`) : null}
              {cell("amount", money(item.quantity * item.price))}
            </View>
  );

  return (
    <Document title={`${view.label} ${data.number ?? ""}`}>
      <Page
        size="A4"
        style={{ paddingTop: 32, paddingBottom: 24, fontFamily: "Helvetica", fontSize: SIZE, color: MUTED, lineHeight: 1.4 }}
      >
        <View style={{ paddingHorizontal: MARGIN }}>
          <View style={{ alignItems: "center", paddingBottom: 16 }}>
            {from.logo_url ? (
              <PdfImage src={from.logo_url} width={180} height={40} fit="contain" style={{ margin: 0 }} />
            ) : (
              <Text style={{ fontSize: 16, lineHeight: 1.25, fontFamily: "Helvetica-Bold", color: INK, textAlign: "center" }}>
                {fitText(from.name ?? "Your Business", CONTENT, 16)}
              </Text>
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 16,
              borderTopWidth: 0.5,
              borderBottomWidth: 0.5,
              borderColor: RULE_COLOR,
              paddingVertical: 11,
            }}
          >
            <View style={{ width: CONTENT - 176 }}>
              <Text style={{ fontSize: 20, lineHeight: 1.25, fontFamily: "Helvetica-Bold", color: INK }}>{view.label}</Text>
              <Text style={{ marginTop: 3 }}>
                {fitText(data.number ?? "—", CONTENT - 176, SIZE)}
              </Text>
              {data.status === "canceled" ? (
                <Text style={{ fontSize: 8, lineHeight: 1.25, fontFamily: "Helvetica-Bold", color: "#dc2626", marginTop: 3 }}>CANCELED</Text>
              ) : null}
            </View>
            <View style={{ width: 160, alignItems: "flex-end" }}>
              <Text style={{ fontSize: 11, lineHeight: 1.25, color: INK }}>{view.formatDate(data.issueDate)}</Text>
              {data.secondaryDate !== undefined ? (
                <Text style={{ marginTop: 3, textTransform: "capitalize" }}>
                  {`${view.secondaryDateLabel}: ${view.formatDate(data.secondaryDate)}`}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 20, paddingHorizontal: 12, paddingVertical: 15 }}>
            <Party title="From" party={from} width={partyWidth} />
            <Party title={view.customerLabel} party={customer} width={partyWidth} />
          </View>

          {view.customFields.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                columnGap: 20,
                rowGap: 3,
                borderTopWidth: 0.5,
                borderTopColor: RULE_COLOR,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              {view.customFields.map((field) => (
                <View key={field.id} style={{ width: partyWidth, flexDirection: "row", gap: 8 }}>
                  <Text style={{ width: (partyWidth - 8) / 2 }}>
                    {fitText(field.label, (partyWidth - 8) / 2, SIZE)}
                  </Text>
                  <Text style={{ width: (partyWidth - 8) / 2, textAlign: "right", color: INK }}>
                    {fitText(field.value, (partyWidth - 8) / 2, SIZE)}
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

          <View
            style={{
              flexDirection: stackedTotals ? "column-reverse" : "row",
              gap: 16,
              borderTopWidth: 0.5,
              borderTopColor: RULE_COLOR,
              marginTop: 4,
              paddingTop: 12,
            }}
          >
            {notes}
            <View wrap={false} style={{ width: totalsBox, alignSelf: "flex-end" }}>
              {totalsRows.map((row) => (
                <View
                  key={row.label}
                  style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 4 }}
                >
                  <Text>{row.label}</Text>
                  <Text>{row.value}</Text>
                </View>
              ))}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: BAND,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  marginTop: 3,
                  fontFamily: "Helvetica-Bold",
                  color: INK,
                }}
              >
                <Text>Total</Text>
                <Text>{totalText}</Text>
              </View>
            </View>
          </View>
        </View>

        {data.paymentDetails ? (
          <View style={{ backgroundColor: BAND, paddingHorizontal: MARGIN, paddingVertical: 12, marginTop: 20 }}>
            <View style={{ backgroundColor: "#ffffff", padding: 12 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", color: INK, marginBottom: 4 }}>Payment Details</Text>
              <Text >{fitText(data.paymentDetails, CONTENT - 24, SIZE)}</Text>
            </View>
          </View>
        ) : null}

        <View wrap={false}>
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: MARGIN, paddingVertical: 16 }}
          >
            <View style={{ flexGrow: 1, height: 0.5, backgroundColor: MUTED }} />
            <Text style={{ fontSize: 10, lineHeight: 1.25, fontFamily: "Helvetica-Oblique", color: INK }}>
              {view.isQuote ? "Thanks for considering us!" : "Thanks for your business!"}
            </Text>
            <View style={{ flexGrow: 1, height: 0.5, backgroundColor: MUTED }} />
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              backgroundColor: BAND,
              paddingHorizontal: MARGIN,
              paddingVertical: 10,
            }}
          >
            <View style={{ width: data.publicUrl ? CONTENT - 76 : CONTENT }}>
              {footerItems.map((item) => (
                <Text key={item} style={{ fontSize: 8 }}>
                  {fitText(item, data.publicUrl ? CONTENT - 76 : CONTENT, 8)}
                </Text>
              ))}
            </View>
            {data.publicUrl ? <PdfQRCode value={data.publicUrl} size={60} backgroundColor={BAND} /> : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}
