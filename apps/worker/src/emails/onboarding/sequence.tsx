import React from "react"
import {
  OnboardingEmail,
  P,
  Heading,
  InlineLink,
  Screenshot,
  Steps,
  Cta,
  Next,
  SignOff,
  FIRST_NAME,
  APP_URL,
  IMG_URL,
} from "./components"

// One feature per email, from one named person, each ending with a pointer to the
// next. Every account gets every email in order, whatever they've already set up,
// so the copy never assumes what the reader has or hasn't done. The Day 0 welcome
// is sent separately by the on-user-signup edge function; this sequence starts on Day 1.

export type OnboardingStep = {
  key: string
  /** Resend template alias. */
  alias: string
  subject: string
  preview: string
  /** Delay after the previous email (the first is measured from signup). */
  delay: string
  Email: () => React.ReactElement
}

const GUIDES_URL = "https://travadabooks.com/guides"

function FirstInvoice() {
  return (
    <OnboardingEmail preview="Email it, send it on WhatsApp, or schedule it for later. Your customer needs no login.">
      <P>Hi {FIRST_NAME}, Curtis here.</P>
      <P>Today: invoices, the heart of Travada Books. Most people send their first one in about two minutes.</P>
      <Screenshot src={`${IMG_URL}/invoices.png`} alt="The Invoices page in Travada Books" />
      <Heading>How it works</Heading>
      <Steps
        items={[
          {
            title: "Pick a customer",
            body: "Or type a new name and add them without leaving the invoice.",
          },
          {
            title: "Add what you're billing for",
            body: "Line items, quantities and rates, in any currency. Discounts and tax are optional, and the totals update as you type.",
          },
          {
            title: "Send it your way",
            body: "Email it, open it in WhatsApp with the link ready, copy the link, download the PDF, or schedule it to go out on a later date.",
          },
        ]}
      />
      <P>
        Your customer opens a clean page with your logo and can download a PDF. No account, nothing
        to install. Back in Travada Books, every invoice shows where it stands: Draft, Sent,
        Part-paid, Paid or Overdue.
      </P>
      <Cta href={`${APP_URL}/invoices/create`}>Create an invoice →</Cta>
      <Next>Next: making every invoice look and read like yours, without setting it up each time.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function InvoiceSettings() {
  return (
    <OnboardingEmail preview="Your logo, numbering, payment terms and bank details, set once for every invoice.">
      <P>Hi {FIRST_NAME},</P>
      <P>
        If you find yourself typing the same payment details or notes on every invoice, today's email
        will save you a lot of time. It's all in <strong>Invoice Settings</strong>, at the top of the
        invoice form.
      </P>
      <Screenshot src={`${IMG_URL}/invoice-settings.png`} alt="Invoice Settings with a default note, payment details, a PO number field and an accountant on CC" />
      <Heading>Set it once</Heading>
      <Steps
        items={[
          {
            title: "Logo and numbering",
            body: "Add your logo and choose how numbers look, like INV-0001. Every new invoice gets the next number.",
          },
          {
            title: "Payment terms",
            body: "Due on receipt, or Net 7 up to Net 60. The due date fills itself in.",
          },
          {
            title: "Default note and payment details",
            body: "Your terms, your bank or M-Pesa details. Already filled in on every new invoice.",
          },
          {
            title: "Copy someone in",
            body: "Add your accountant (or yourself) under CC or BCC and they get a copy of every invoice you email.",
          },
        ]}
      />
      <Heading>Custom fields</Heading>
      <P>
        Need a PO number, project name or container number on the invoice? Add a custom field. Save
        the labels as defaults and they're on every new invoice, waiting for a value. They carry
        through to the customer's link, the PDF and recurring invoices.
      </P>
      <Cta href={`${APP_URL}/invoices/create`}>Open Invoice Settings →</Cta>
      <Next>Next: quotes your customers accept from a link, which turn into invoices for you.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Quotes() {
  return (
    <OnboardingEmail preview="Send a quote, they accept it from a link, and the invoice is drafted for you.">
      <P>Hi {FIRST_NAME}, Curtis here again.</P>
      <P>
        A lot of work starts with "how much would it cost?" Today: quotes, and why they save you
        typing everything twice.
      </P>
      <Screenshot src={`${IMG_URL}/quote-accepted.png`} alt="An accepted quote with the invoice created from it" />
      <Steps
        items={[
          {
            title: "Send a quote",
            body: "Same editor as invoices, plus a Valid until date.",
          },
          {
            title: "Your customer accepts or declines from the link",
            body: "No login. You're notified either way.",
          },
          {
            title: "An invoice is drafted for you",
            body: "Same customer, same line items, same custom fields. Check it over and send it when the work's done.",
          },
        ]}
      />
      <P>
        If a quote passes its Valid until date without an answer, it's marked expired so your list
        stays honest. Quotes have their own settings too, including a default validity period.
      </P>
      <Cta href={`${APP_URL}/quotes/create`}>Create a quote →</Cta>
      <Next>Next: what to do when the money comes in, all of it or just part.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Payments() {
  return (
    <OnboardingEmail preview="Paid in full or paid in parts, every invoice knows what's still owed.">
      <P>Hi {FIRST_NAME},</P>
      <P>
        Customers don't always pay the way you invoiced them. Half now, the rest at the end of the
        month. Today: recording payments, so you always know exactly what's still owed.
      </P>
      <Screenshot src={`${IMG_URL}/payments-status.png`} alt="Invoices showing Sent, Part-paid and Paid statuses" />
      <Steps
        items={[
          {
            title: "Open the invoice and select Record payment",
            body: "The amount is filled in with the balance due. Change it if they paid less.",
          },
          {
            title: "Add the date, method and a reference",
            body: "Like an M-Pesa code or cheque number, so you can find it later.",
          },
          {
            title: "The invoice updates itself",
            body: "Part-paid with the balance left, or Paid once it's all in. The balance shows on the invoice, your list and the customer's page.",
          },
        ]}
      />
      <P>
        Each payment also lands in your transactions as money in, on the day you were paid, so your
        numbers follow the cash as it actually arrives.
      </P>
      <Cta href={`${APP_URL}/invoices`}>Go to your invoices →</Cta>
      <Next>Next: letting customers pay you by M-Pesa straight from the invoice.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function MpesaPayments() {
  return (
    <OnboardingEmail preview="Connect a payout account once and every invoice gets a Pay button.">
      <P>Hi {FIRST_NAME},</P>
      <P>
        The quickest way to get paid sooner is to make paying you take one tap. Today: letting
        customers pay an invoice by M-Pesa, right from the invoice link.
      </P>
      <Screenshot src={`${IMG_URL}/mpesa-pay.png`} alt="An invoice on a phone with a Pay button, and the M-Pesa payment screen" />
      <Heading>What happens</Heading>
      <Steps
        items={[
          {
            title: "Connect a payout account",
            body: "Add the M-Pesa number or Kenyan bank account you want paid into. We check the details before switching payments on.",
          },
          {
            title: "Your invoices get a Pay button",
            body: "Your customer pays by M-Pesa from the invoice link. No paybill numbers to copy, no codes to send you.",
          },
          {
            title: "The invoice marks itself paid",
            body: "When the payment lands, the invoice is marked paid (or part-paid) and you get a notification.",
          },
        ]}
      />
      <P>
        <strong>What it costs:</strong> our payments partner Paystack charges 1.5% on M-Pesa, taken
        before payout. Travada Books takes nothing.
      </P>
      <P>
        Payouts are available to businesses in Kenya for now. Not in Kenya, or rather collect your own
        way? Keep recording payments by hand, exactly as in my last email.
      </P>
      <Cta href={`${APP_URL}/settings/integrations/paystack`}>Turn on M-Pesa payments →</Cta>
      <Next>Next: invoices that send themselves, every week, month or year.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Recurring() {
  return (
    <OnboardingEmail preview="Set up a retainer once. Travada Books sends it on time, every time.">
      <P>Hi {FIRST_NAME}, Curtis here.</P>
      <P>
        Billing the same customer the same amount every month? Today: recurring invoices, so you set
        it up once and never think about it again.
      </P>
      <Screenshot src={`${IMG_URL}/recurring.png`} alt="The Recurring Invoice options, showing the next three invoice dates" />
      <Steps
        items={[
          {
            title: "Create the first invoice as usual",
            body: "Customer, line items, tax and notes. Every invoice in the series copies it.",
          },
          {
            title: "Choose Recurring and how often",
            body: "Weekly, every 2 weeks, monthly, every 3 months or yearly. End it on a date, after a number of invoices, or never.",
          },
          {
            title: "Travada Books does the rest",
            body: "On each date it creates the invoice, gives it the next number, moves the dates along and emails it to your customer.",
          },
        ]}
      />
      <P>
        You can pause or cancel a series any time from the Recurring Series panel on any of its
        invoices. And for a one-off you want to send later, use <strong>Schedule Send</strong> instead.
      </P>
      <Cta href={`${APP_URL}/invoices/create`}>Set up a recurring invoice →</Cta>
      <Next>Next: the polite follow-up, sent for you, when an invoice goes overdue.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Reminders() {
  return (
    <OnboardingEmail preview="Late invoices are flagged for you, and the reminder can go out on its own.">
      <P>Hi {FIRST_NAME},</P>
      <P>
        Chasing payments is the part of running a business nobody enjoys. Today: how Travada Books
        does most of the chasing for you.
      </P>
      <Screenshot src={`${IMG_URL}/reminder.png`} alt="A payment reminder email showing the balance still due" />
      <Heading>Overdue, automatically</Heading>
      <P>
        The day after an invoice's due date, if nothing's been paid, it's marked Overdue. The Overdue
        card on your Invoices page shows how much is late and on how many invoices.
      </P>
      <Heading>Reminders that send themselves</Heading>
      <P>
        In Invoice Settings, turn on <strong>Auto Reminders</strong> and choose 3, 5, 7 or 10 days
        after the due date. Each overdue or part-paid invoice gets a reminder on that day, showing
        what's left to pay and a button to view the invoice. Paid invoices never get one.
      </P>
      <Heading>Or nudge them yourself</Heading>
      <P>
        Select <strong>Send reminder</strong> from any sent invoice's menu, even before it's due. No
        more writing the awkward "just following up" message.
      </P>
      <Cta href={`${APP_URL}/invoices/create`}>Turn on Auto Reminders →</Cta>
      <Next>Next: everything about a customer on one page, and the statement that settles "what do we owe you?"</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Customers() {
  return (
    <OnboardingEmail preview="What they've been billed, what they've paid, and a statement in two clicks.">
      <P>Hi {FIRST_NAME}, it's Curtis.</P>
      <P>
        Today: your customers. Add someone once and their details are filled in on every invoice,
        quote and statement.
      </P>
      <Screenshot src={`${IMG_URL}/customer.png`} alt="A customer's page with Total Invoiced, Total Paid, Outstanding and invoice history" />
      <Heading>One page per customer</Heading>
      <P>
        Each customer's page shows what you've invoiced them, what they've paid and what's still
        outstanding, with their full invoice history. Add a company email or website and Travada
        Books looks the company up and fills in what it can find, like their address, industry and
        logo.
      </P>
      <Heading>Statements of account</Heading>
      <P>
        When a customer asks what they owe, select <strong>Statement</strong> on their page and pick
        the period. You get every invoice and payment with a running balance, ready to email, share
        as a link or download as a PDF. Every statement is saved, so you can send it again later.
      </P>
      <Cta href={`${APP_URL}/customers`}>Open your customers →</Cta>
      <Next>Next: one private link that gives a customer everything they need from you.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function CustomerPortal() {
  return (
    <OnboardingEmail preview="Their balance, every invoice, quotes and statements, behind one link. No login.">
      <P>Hi {FIRST_NAME},</P>
      <P>
        Invoice links get buried in email threads and chats, and then the customer asks you to send it
        again. Today: the customer portal, one link per customer that always has everything.
      </P>
      <Screenshot src={`${IMG_URL}/portal.png`} alt="A customer portal on a phone, showing the balance due and outstanding invoices" />
      <Heading>What your customer sees</Heading>
      <P>
        Your logo, their balance due and anything overdue, then every invoice split into Outstanding
        and Paid. Quotes waiting for an answer are there to accept, and so is every statement you've
        sent them. It's laid out for a phone, because that's where most customers will open it.
      </P>
      <Heading>You stay in control</Heading>
      <Steps
        items={[
          {
            title: "It's off until you switch it on",
            body: "From the customer's page, one customer at a time.",
          },
          {
            title: "Share it however you like",
            body: "Copy the link or send it on WhatsApp. There's no login, the private link is the key.",
          },
          {
            title: "Sent it to the wrong person?",
            body: "Regenerate the link and the old one stops working straight away.",
          },
        ]}
      />
      <Cta href={`${APP_URL}/customers`}>Switch on a customer portal →</Cta>
      <Next>Next: the other half of your books. A year of bank and M-Pesa records in one upload.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function StatementImport() {
  return (
    <OnboardingEmail preview="Upload a CSV or PDF from any bank or M-Pesa. We sort the rest.">
      <P>Hi {FIRST_NAME}, Curtis here.</P>
      <P>
        Invoices are half the picture. The other half is everything that's already moved through your
        accounts. Today: getting a whole year of it into Travada Books in one upload.
      </P>
      <Screenshot src={`${IMG_URL}/statement-import.png`} alt="Bank and M-Pesa statements flowing into Travada Books" />
      <Steps
        items={[
          {
            title: "Download a statement",
            body: "From your bank or M-Pesa, as a CSV or PDF. Any layout works.",
          },
          {
            title: "Upload it on the Transactions page",
            body: "We read it, skip anything you've already imported, tidy up the descriptions and suggest a category for each line.",
          },
          {
            title: "Check it over",
            body: "Fix anything that looks off. More on that in my next email.",
          },
        ]}
      />
      <P>
        Once your transactions are in, your dashboard shows what's actually coming in and going out
        each month, not just what you've invoiced.
      </P>
      <Cta href={`${APP_URL}/transactions`}>Import a statement →</Cta>
      <Next>Next: keeping those transactions tidy in minutes, not hours.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Transactions() {
  return (
    <OnboardingEmail preview="Categories suggested for you, bulk edits, and search in plain words.">
      <P>Hi {FIRST_NAME},</P>
      <P>
        Categories tell you where your money comes from and where it goes. Today: how Travada Books
        keeps your transactions organised, so your job is mostly checking.
      </P>
      <Screenshot src={`${IMG_URL}/transactions.png`} alt="The Transactions page with four transactions selected and the bulk-edit bar" />
      <Heading>Categories, suggested</Heading>
      <P>
        Every imported or added transaction gets a suggested category. Change one, and if others look
        similar, like payments to the same supplier, Travada Books offers to update them too. Add
        your own categories in Settings.
      </P>
      <Heading>Change many at once</Heading>
      <P>
        Tick a few transactions (or a whole page) and set the category, status, payment mode or
        recurring frequency for all of them in one go.
      </P>
      <Heading>Search like you'd ask</Heading>
      <P>
        Type "fuel expenses last month" or "income over 50,000 in August" and press Enter. Travada
        Books turns it into filters for you.
      </P>
      <P>
        Cash sale that's not on any statement? Add it with <strong>+ New Transaction</strong>, and
        link income to the invoice it paid.
      </P>
      <Cta href={`${APP_URL}/transactions`}>Go to your transactions →</Cta>
      <Next>Next: getting receipts out of your email and onto the right transaction, without lifting a finger.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Inbox() {
  return (
    <OnboardingEmail preview="Forward receipts from any inbox and they're read, matched and filed for you.">
      <P>Hi {FIRST_NAME}, Curtis here.</P>
      <P>
        If your receipts are scattered across your email, your phone's camera roll and a drawer,
        today's email is for you.
      </P>
      <Screenshot src={`${IMG_URL}/inbox.png`} alt="Receipts from email matched to transactions in Travada Books" />
      <Steps
        items={[
          {
            title: "Get receipts in",
            body: "Forward them from any inbox, Gmail included, to your own Travada inbox address. Or connect Outlook and PDF receipts are collected on their own.",
          },
          {
            title: "We read them",
            body: "The amount, currency, invoice number and supplier are pulled out of each one.",
          },
          {
            title: "Confirm the match",
            body: "Each receipt comes with a suggested transaction. Confirm it and it's attached. Matches get better the more you confirm.",
          },
        ]}
      />
      <P>
        Supplier sending newsletters you don't want? Block them under Blocked senders. You can also
        drop receipt photos or PDFs straight onto the Transactions page and they're matched the same
        way.
      </P>
      <Cta href={`${APP_URL}/inbox`}>Open your inbox →</Cta>
      <P>
        Your inbox address is on the{" "}
        <InlineLink href={`${APP_URL}/settings/inbox`}>Inbox settings page</InlineLink>.
      </P>
      <Next>Next: where every receipt, contract and invoice PDF ends up, and how to find any of them in seconds.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Vault() {
  return (
    <OnboardingEmail preview="Every document in one place, named for you and searchable in plain words.">
      <P>Hi {FIRST_NAME},</P>
      <P>
        Today: the Vault, where your business documents live. Contracts, licences, tax papers,
        receipts and anything else you need to keep.
      </P>
      <Screenshot src={`${IMG_URL}/vault.png`} alt="The Vault with its folders and receipts" />
      <Heading>It fills itself</Heading>
      <P>
        Receipts from your inbox, files attached to transactions, and PDFs of every invoice, quote
        and statement you send are all saved here automatically. Upload anything else yourself, and
        Travada Books gives it a clear title, a short description and tags.
      </P>
      <Heading>Find anything</Heading>
      <P>
        Search by name or by what's inside the document, or ask in plain words, like "contracts from
        last year". Sort things into folders: every Vault starts with Contracts, Tax &amp;
        Compliance, Receipts, Invoices, Licenses and Bank Documents.
      </P>
      <Heading>Share by link</Heading>
      <P>
        Need to send a document to someone? Copy a share link. They can download it without an
        account, and the link expires after 30 days.
      </P>
      <Cta href={`${APP_URL}/vault`}>Open your Vault →</Cta>
      <Next>Next: what all of this adds up to. Your numbers, on one screen.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Dashboard() {
  return (
    <OnboardingEmail preview="Revenue, cash flow, who owes you and how long your cash will last.">
      <P>Hi {FIRST_NAME}, Curtis here.</P>
      <P>
        With your invoices and transactions in, your dashboard turns them into the numbers that
        matter. Today: what's on it and how to make it yours.
      </P>
      <Screenshot src={`${IMG_URL}/dashboard.png`} alt="The Travada Books dashboard" />
      <Heading>Overview</Heading>
      <P>
        Cards for the things you check most: overdue and outstanding invoices, revenue, cash flow,
        profit and loss, your top customer, where your money goes, how fast customers pay you, your
        quotes pipeline and more. Drag them into the order you like, and pick up to seven. Each
        teammate gets their own layout.
      </P>
      <Heading>Metrics</Heading>
      <P>
        Charts that show how things change month by month. Choose the period, gross or net revenue,
        and which currency to see it all in.
      </P>
      <P>
        <strong>One tip:</strong> add your opening balance and the Cash Cushion card tells you how
        many months your cash would last at your current spending.
      </P>
      <Cta href={APP_URL}>Open your dashboard →</Cta>
      <Next>Next: making month-end with your accountant a five-minute job.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Accountant() {
  return (
    <OnboardingEmail preview="A spreadsheet of your transactions with every receipt, sent straight to your accountant.">
      <P>Hi {FIRST_NAME},</P>
      <P>
        When your accountant asks for the month's figures, you shouldn't have to spend an evening
        digging through receipts. Today: exports.
      </P>
      <Screenshot src={`${IMG_URL}/export.png`} alt="Exporting transactions as CSV and emailing them to an accountant" />
      <Steps
        items={[
          {
            title: "Filter to what they need",
            body: "The month, a category, whatever they asked for. Then tick the transactions.",
          },
          {
            title: "Export as CSV or Excel",
            body: "Date, counterparty, amount, category, tax and notes, one row per transaction.",
          },
          {
            title: "Receipts come with it",
            body: "If any transactions have files attached, you get a ZIP with the spreadsheet and a folder of receipts for each line.",
          },
        ]}
      />
      <P>
        Turn on <strong>Send by email</strong> and add your accountant's address, and they get a
        download link directly. Before you send, check every transaction has a category and its
        receipt, and add a note to anything unusual. Notes are included.
      </P>
      <Cta href={`${APP_URL}/transactions`}>Export your transactions →</Cta>
      <Next>Next: giving your team, or your accountant, their own login.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function Team() {
  return (
    <OnboardingEmail preview="Everyone working from the same books, each with their own login.">
      <P>Hi {FIRST_NAME}, it's Curtis again.</P>
      <P>
        Today: inviting the people who help you run the business, whether that's a partner, someone
        who handles your admin, or your accountant.
      </P>
      <Screenshot src={`${IMG_URL}/team.png`} alt="Inviting two teammates to Travada Books" />
      <P>There are two roles:</P>
      <Steps
        items={[
          {
            title: "Member",
            body: "Day-to-day work: invoices, quotes, payments, customers, transactions, the Inbox and the Vault.",
          },
          {
            title: "Owner",
            body: "Everything a member can do, plus inviting and removing people, changing roles and exporting all your data.",
          },
        ]}
      />
      <P>
        Invite up to five people at once. Each person gets their own login, so there are no shared
        passwords, and you can remove someone in a click if they leave. One login can belong to more
        than one business, too.
      </P>
      <Cta href={`${APP_URL}/settings/team`}>Invite your team →</Cta>
      <Next>That's the tour. In a few days I'll check in to see how it's going.</Next>
      <SignOff />
    </OnboardingEmail>
  )
}

function CheckIn() {
  return (
    <OnboardingEmail preview="One question, and you can answer it in a sentence.">
      <P>Hi {FIRST_NAME},</P>
      <P>
        You've had Travada Books for about a month now, and this is the last of my getting-started
        emails.
      </P>
      <P bold>I'd love to know: what's the one thing that would make Travada Books more useful to you?</P>
      <P>
        It might be something missing, something confusing, or something that took longer than it
        should have. Just hit reply. A sentence is plenty. Nate and I read every answer, and a lot of
        what we've built so far started as a reply to this email.
      </P>
      <P>
        If you'd like to look back at anything we've covered, the{" "}
        <InlineLink href={GUIDES_URL}>guides</InlineLink> walk through every feature step by step.
      </P>
      <P>Thanks for giving us a go.</P>
      <SignOff signature />
    </OnboardingEmail>
  )
}

const steps: [key: string, subject: string, preview: string, delay: string, Email: () => React.ReactElement][] = [
  ["first-invoice", "Send your first invoice in two minutes", "Email it, send it on WhatsApp, or schedule it for later. Your customer needs no login.", "1 day", FirstInvoice],
  ["invoice-settings", "Set up your invoices once, not every time", "Your logo, numbering, payment terms and bank details, set once for every invoice.", "1 day", InvoiceSettings],
  ["quotes", "Quotes that turn into invoices on their own", "Send a quote, they accept it from a link, and the invoice is drafted for you.", "2 days", Quotes],
  ["payments", "Paid in full, or paid in parts", "Paid in full or paid in parts, every invoice knows what's still owed.", "2 days", Payments],
  ["mpesa-payments", "Let customers pay you by M-Pesa from the invoice", "Connect a payout account once and every invoice gets a Pay button.", "2 days", MpesaPayments],
  ["recurring", "Invoices that send themselves", "Set up a retainer once. Travada Books sends it on time, every time.", "2 days", Recurring],
  ["reminders", "Stop chasing payments", "Late invoices are flagged for you, and the reminder can go out on its own.", "2 days", Reminders],
  ["customers", "Everything about a customer, on one page", "What they've been billed, what they've paid, and a statement in two clicks.", "2 days", Customers],
  ["customer-portal", "One link that gives your customer everything", "Their balance, every invoice, quotes and statements, behind one link. No login.", "2 days", CustomerPortal],
  ["statement-import", "A year of M-Pesa and bank records in one upload", "Upload a CSV or PDF from any bank or M-Pesa. We sort the rest.", "2 days", StatementImport],
  ["transactions", "Tidy books in minutes, not hours", "Categories suggested for you, bulk edits, and search in plain words.", "2 days", Transactions],
  ["inbox", "Every receipt, matched to the right transaction", "Forward receipts from any inbox and they're read, matched and filed for you.", "2 days", Inbox],
  ["vault", "Find any document in seconds", "Every document in one place, named for you and searchable in plain words.", "2 days", Vault],
  ["dashboard", "Your business, in numbers", "Revenue, cash flow, who owes you and how long your cash will last.", "2 days", Dashboard],
  ["accountant", "Month-end with your accountant, in five minutes", "A spreadsheet of your transactions with every receipt, sent straight to your accountant.", "2 days", Accountant],
  ["team", "Bring your team (or your accountant) in", "Everyone working from the same books, each with their own login.", "2 days", Team],
  ["check-in", "A month in. What's missing?", "One question, and you can answer it in a sentence.", "3 days", CheckIn],
]

export const ONBOARDING_SEQUENCE: OnboardingStep[] = steps.map(([key, subject, preview, delay, Email], i) => ({
  key: key.replace(/-/g, "_"),
  alias: `onboarding-${String(i + 1).padStart(2, "0")}-${key}`,
  subject,
  preview,
  delay,
  Email,
}))
