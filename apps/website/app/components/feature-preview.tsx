import {
  BankIcon,
  CheckmarkCircle01Icon,
  ClockCheckIcon,
  Download01Icon,
  FileSpreadsheetIcon,
  GmailIcon,
  InboxIcon,
  Link01Icon,
  Mail01Icon,
  OutlookIcon,
  ReceiptTextIcon,
  RepeatIcon,
  Sent02Icon,
  TickIcon,
} from "@travada-books/ui/icons"

export type FeatureVisual =
  | "recurring"
  | "schedule"
  | "reminders"
  | "quotes"
  | "payments"
  | "import"
  | "categories"
  | "bulk"
  | "export"
  | "providers"
  | "capture"
  | "matching"
  | "forwarding"

const visualContent: Record<FeatureVisual, { title: string; eyebrow: string }> = {
  recurring: { title: "Recurring invoice", eyebrow: "AUTOMATION" },
  schedule: { title: "Schedule send", eyebrow: "DELIVERY" },
  reminders: { title: "Payment reminders", eyebrow: "FOLLOW-UP" },
  quotes: { title: "Quote Q-018", eyebrow: "QUOTE" },
  payments: { title: "Record payment", eyebrow: "PAYMENT" },
  import: { title: "Import statement", eyebrow: "STATEMENT IMPORT" },
  categories: { title: "Transactions", eyebrow: "BOOKKEEPING" },
  bulk: { title: "128 selected", eyebrow: "BULK ACTION" },
  export: { title: "Export records", eyebrow: "EXPORT" },
  providers: { title: "Connect an inbox", eyebrow: "INTEGRATIONS" },
  capture: { title: "Receipt inbox", eyebrow: "DOCUMENTS" },
  matching: { title: "Suggested match", eyebrow: "RECONCILIATION" },
  forwarding: { title: "Forwarding address", eyebrow: "INBOX SETTINGS" },
}

function WindowShell({ visual, children }: { visual: FeatureVisual; children: React.ReactNode }) {
  const content = visualContent[visual]
  return (
    <div className="feature-preview__window">
      <div className="feature-preview__chrome">
        <span /><span /><span />
        <p>{content.eyebrow}</p>
        <i>•••</i>
      </div>
      <div className="feature-preview__title">
        <div><small>{content.eyebrow}</small><strong>{content.title}</strong></div>
        <button type="button">Save</button>
      </div>
      <div className="feature-preview__content">{children}</div>
    </div>
  )
}

function RecurringVisual({ visual }: { visual: "recurring" | "schedule" | "reminders" }) {
  const selected = visual === "recurring" ? "Monthly" : visual === "schedule" ? "Tue, 9:00 AM" : "7 days late"
  const Icon = visual === "recurring" ? RepeatIcon : visual === "schedule" ? Sent02Icon : ClockCheckIcon
  return (
    <WindowShell visual={visual}>
      <div className="preview-form-row"><span>Customer</span><b>Northline Limited</b></div>
      <div className="preview-choice-grid">
        {["Weekly", "Monthly", "Quarterly"].map((choice) => <span className={choice === "Monthly" ? "is-selected" : ""} key={choice}>{choice}</span>)}
      </div>
      <div className="preview-highlight"><Icon /><div><small>{visualContent[visual].title}</small><b>{selected}</b></div><CheckmarkCircle01Icon /></div>
      <div className="preview-timeline">
        {["01 Oct", "01 Nov", "01 Dec"].map((date, i) => <div key={date}><i className={i === 0 ? "is-now" : ""} /><span>{date}</span></div>)}
      </div>
    </WindowShell>
  )
}

function DocumentVisual({ visual }: { visual: "quotes" | "payments" }) {
  return (
    <WindowShell visual={visual}>
      <div className="preview-document">
        <div className="preview-document__head"><span>TRAVADA</span><b>{visual === "quotes" ? "QUOTE" : "INVOICE"}</b></div>
        <div className="preview-document__client"><small>BILL TO</small><strong>Acacia House</strong></div>
        <div className="preview-document__lines"><i /><i /><i /></div>
        <div className="preview-document__total"><span>Balance due</span><b>KES 31,200</b></div>
      </div>
      <div className="preview-status-card">
        {visual === "quotes" ? <Link01Icon /> : <TickIcon />}
        <div><small>{visual === "quotes" ? "Customer response" : "Payment recorded"}</small><b>{visual === "quotes" ? "Accepted" : "KES 20,000"}</b></div>
      </div>
    </WindowShell>
  )
}

function ImportVisual({ visual }: { visual: "import" | "categories" | "bulk" | "export" }) {
  const Icon = visual === "export" ? Download01Icon : visual === "categories" ? BankIcon : FileSpreadsheetIcon
  return (
    <WindowShell visual={visual}>
      {visual === "import" ? (
        <>
          <div className="preview-dropzone"><FileSpreadsheetIcon /><b>august-statement.csv</b><span>428 rows detected</span></div>
          <div className="preview-map"><span>Date <b>Transaction date</b></span><i>→</i><span>Amount <b>Credit / debit</b></span></div>
          <div className="preview-progress"><i /><span>Ready to import 428 transactions</span></div>
        </>
      ) : visual === "export" ? (
        <>
          <div className="preview-export-icon"><Icon /></div>
          <p className="preview-export-copy">Choose a format for 428 transactions</p>
          <div className="preview-choice-grid"><span className="is-selected">CSV</span><span>Excel</span><span>Selected only</span></div>
        </>
      ) : (
        <div className="preview-transactions">
          {[
            ["Safaricom PLC", "Utilities", "− KES 4,850"],
            ["Northline Ltd", "Income", "+ KES 72,500"],
            ["Java House", "Meals", "− KES 2,140"],
            ["Adobe Systems", "Software", "− KES 8,240"],
          ].map(([name, category, amount], index) => (
            <div key={name}><i className={visual === "bulk" && index < 3 ? "is-checked" : ""} /><span><b>{name}</b><small>{category}</small></span><strong>{amount}</strong></div>
          ))}
          {visual === "bulk" && <div className="preview-bulkbar"><span>3 selected</span><b>Set category</b><b>Payment method</b></div>}
        </div>
      )}
    </WindowShell>
  )
}

function InboxVisual({ visual }: { visual: "providers" | "capture" | "matching" | "forwarding" }) {
  if (visual === "providers") {
    return <WindowShell visual={visual}><div className="preview-providers"><article><GmailIcon /><span><b>Google Workspace</b><small>Find PDF receipts automatically</small></span><button type="button">Connect</button></article><article><OutlookIcon /><span><b>Microsoft Outlook</b><small>Read-only inbox access</small></span><button type="button">Connect</button></article></div></WindowShell>
  }
  if (visual === "forwarding") {
    return <WindowShell visual={visual}><div className="preview-forward"><Mail01Icon /><p><small>Your Travada inbox</small><b>acacia@inbox.travadabooks.com</b></p><button type="button">Copy</button></div><div className="preview-forward-steps"><span><i>1</i>Forward the email</span><span><i>2</i>We read the PDF</span><span><i>3</i>It appears in your Vault</span></div></WindowShell>
  }
  return (
    <WindowShell visual={visual}>
      {visual === "capture" ? (
        <div className="preview-mail-list">
          {[["Adobe", "Your August receipt", "PDF"], ["Google Cloud", "Invoice available", "PDF"], ["Jumia", "Order receipt", "PDF"]].map(([from, subject, type]) => <div key={from}><InboxIcon /><span><b>{from}</b><small>{subject}</small></span><em>{type}</em></div>)}
        </div>
      ) : (
        <div className="preview-match">
          <article><ReceiptTextIcon /><span><small>RECEIPT</small><b>Adobe · KES 8,240</b></span></article>
          <div><i /><CheckmarkCircle01Icon /><i /></div>
          <article><BankIcon /><span><small>TRANSACTION</small><b>Adobe Systems · 14 Aug</b></span></article>
          <p>96% confidence · Ready to match</p>
        </div>
      )}
    </WindowShell>
  )
}

export function FeaturePreview({ visual, label }: { visual: FeatureVisual; label: string }) {
  return (
    <div className={`feature-preview feature-preview--${visual}`} role="img" aria-label={label}>
      <div className="feature-preview__grid" aria-hidden="true" />
      {visual === "recurring" || visual === "schedule" || visual === "reminders" ? <RecurringVisual visual={visual} /> : null}
      {visual === "quotes" || visual === "payments" ? <DocumentVisual visual={visual} /> : null}
      {visual === "import" || visual === "categories" || visual === "bulk" || visual === "export" ? <ImportVisual visual={visual} /> : null}
      {visual === "providers" || visual === "capture" || visual === "matching" || visual === "forwarding" ? <InboxVisual visual={visual} /> : null}
    </div>
  )
}
