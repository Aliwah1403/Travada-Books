/**
 * Country-keyed statutory tax calendar.
 *
 * Pure: every function takes `today` as an argument and never reads the
 * clock, so results are deterministic and testable. Dates are handled as
 * local calendar dates (year/month/day) and emitted as ISO `YYYY-MM-DD`
 * strings — no time zones, no times of day.
 *
 * Adding a country = adding one generator to `GENERATORS`. Anything
 * country-specific in the UI must be gated on `isTaxCalendarSupported`, so an
 * unsupported country simply sees nothing.
 */

export type TaxDeadlineKind = "vat" | "payroll" | "withholding" | "income_tax" | "other"

export type TaxDeadline = {
  /** Stable per (rule, period) — safe as a React key. */
  id: string
  name: string
  shortName: string
  /** ISO date `YYYY-MM-DD`. */
  dueDate: string
  /** Human label for the period the filing covers, e.g. "October 2026". */
  periodLabel: string
  description: string
  kind: TaxDeadlineKind
  /** Inclusive ISO start of the period the filing covers, when it maps to a date range. */
  periodFrom?: string
  /** Inclusive ISO end of the period the filing covers, when it maps to a date range. */
  periodTo?: string
}

type DeadlineGenerator = (today: Date) => TaxDeadline[]

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/** `month` is 0-based and may overflow/underflow — normalised via Date. */
function isoDate(year: number, month: number, day: number): string {
  const d = new Date(year, month, day)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month, 1)
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function monthKey(year: number, month: number): string {
  const d = new Date(year, month, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

// ─── Kenya (KRA) ────────────────────────────────────────────────────────────
//
// Rules implemented:
// - VAT return + payment: 20th of the month after the tax period.
// - Payroll remittances: PAYE, NSSF, SHIF (Social Health Insurance Fund) and
//   the Affordable Housing Levy are all due the 9th of the month after the
//   payroll month — grouped into one entry.
// - Instalment tax: 20th day of the 4th, 6th, 9th and 12th months of the
//   financial year. ASSUMPTION: the org uses a calendar (Jan–Dec) financial
//   year, so these fall on 20 Apr, 20 Jun, 20 Sep and 20 Dec. We don't store
//   a financial-year end per org yet.
// - Annual income tax return: 30 June, covering the previous calendar year
//   (6 months after a Dec year-end; also the individual deadline).
//
// Deliberately omitted: withholding tax / withholding VAT. These are due
// within 5 working days of each deduction, i.e. per payment — not a fixed
// monthly date — so a calendar entry would be misleading.
//
// Weekends/public holidays: dates are NOT shifted. KRA treats the stated date
// as the deadline (iTax is online), so a Saturday 20th is still the 20th.

function kenyaDeadlines(today: Date): TaxDeadline[] {
  const y = today.getFullYear()
  const m = today.getMonth()
  const out: TaxDeadline[] = []

  // Monthly filings: periods from last month back a bit through a few months
  // ahead — wider than any sensible horizon; the caller filters by date.
  for (let offset = -2; offset <= 3; offset++) {
    const py = y
    const pm = m + offset // period month (may overflow; normalised by Date)
    const key = monthKey(py, pm)
    const label = monthLabel(py, pm)
    const periodFrom = isoDate(py, pm, 1)
    const periodTo = isoDate(py, pm + 1, 0)

    out.push({
      id: `ke-vat-${key}`,
      name: "VAT return & payment",
      shortName: "VAT",
      dueDate: isoDate(py, pm + 1, 20),
      periodLabel: label,
      description: `File the VAT return and pay any VAT due for ${label} on iTax.`,
      kind: "vat",
      periodFrom,
      periodTo,
    })

    out.push({
      id: `ke-payroll-${key}`,
      name: "Payroll remittances (PAYE, NSSF, SHIF, Housing Levy)",
      shortName: "Payroll",
      dueDate: isoDate(py, pm + 1, 9),
      periodLabel: label,
      description: `Remit PAYE, NSSF, SHIF and the Affordable Housing Levy deducted from ${label} salaries.`,
      kind: "payroll",
      periodFrom,
      periodTo,
    })
  }

  // Yearly items for last, this and next year (calendar financial year).
  for (let year = y - 1; year <= y + 1; year++) {
    const instalments: [number, string][] = [
      [3, "1st"], // April (4th month)
      [5, "2nd"], // June (6th month)
      [8, "3rd"], // September (9th month)
      [11, "4th"], // December (12th month)
    ]
    for (const [month, ordinal] of instalments) {
      out.push({
        id: `ke-instalment-${year}-${ordinal}`,
        name: `Instalment tax (${ordinal} instalment)`,
        shortName: "Instalment tax",
        dueDate: isoDate(year, month, 20),
        periodLabel: `Year of income ${year}`,
        description: `Pay the ${ordinal} income tax instalment for ${year}. Assumes a January–December financial year.`,
        kind: "income_tax",
      })
    }

    out.push({
      id: `ke-income-return-${year - 1}`,
      name: "Annual income tax return",
      shortName: "Income tax return",
      dueDate: isoDate(year, 5, 30),
      periodLabel: `Year of income ${year - 1}`,
      description: `File the ${year - 1} income tax return and pay any balance of tax on iTax.`,
      kind: "income_tax",
      periodFrom: isoDate(year - 1, 0, 1),
      periodTo: isoDate(year - 1, 11, 31),
    })
  }

  return out
}

// ─── Registry ───────────────────────────────────────────────────────────────

const GENERATORS: Record<string, DeadlineGenerator> = {
  KE: kenyaDeadlines,
}

function normalise(countryCode: string | null | undefined): string | null {
  return countryCode ? countryCode.trim().toUpperCase() : null
}

export function isTaxCalendarSupported(countryCode: string | null | undefined): boolean {
  const code = normalise(countryCode)
  return code !== null && Object.prototype.hasOwnProperty.call(GENERATORS, code)
}

/**
 * Upcoming deadlines for a country, from `today` (inclusive) to
 * `today + horizonDays` (inclusive), sorted by due date. Unsupported
 * countries return an empty list.
 */
export function getTaxDeadlines(
  countryCode: string | null | undefined,
  today: Date,
  horizonDays = 45,
): TaxDeadline[] {
  const code = normalise(countryCode)
  if (code === null || !isTaxCalendarSupported(code)) return []

  const start = isoDate(today.getFullYear(), today.getMonth(), today.getDate())
  const end = isoDate(today.getFullYear(), today.getMonth(), today.getDate() + horizonDays)

  return GENERATORS[code](today)
    .filter((d) => d.dueDate >= start && d.dueDate <= end)
    .sort((a, b) => (a.dueDate === b.dueDate ? a.id.localeCompare(b.id) : a.dueDate < b.dueDate ? -1 : 1))
}
