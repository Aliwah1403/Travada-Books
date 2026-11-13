import { createColumnConfigHelper, type FiltersState } from "@bazza-ui/filters";
import {
  Alert01Icon,
  Calendar01Icon,
  FilterIcon,
  InboxIcon,
  Link01Icon,
  Wallet01Icon,
} from "@travada-books/ui/icons";
import { parseDateOnly } from "@/lib/format-date";
import { isBillOverdue, type Bill } from "@/lib/queries/bills";

// Filters for the Bills page, on the same filter kit as Invoices, Quotes,
// Transactions and Vault. Bills are loaded in full, so the page applies these
// to the loaded list with billMatchesFilters. Paid/unpaid stays on the page's
// tabs rather than here, so the two can't contradict each other.

const dtf = createColumnConfigHelper<Bill>();

const SOURCE_OPTIONS = [
  { value: "inbox", label: "From inbox" },
  { value: "manual", label: "Added by hand" },
];

export function createBillColumnsConfig(currencies: string[]) {
  return [
    dtf
      .date()
      .id("dueDate")
      .accessor((b) => (b.due_date ? parseDateOnly(b.due_date) : new Date()))
      .displayName("Due Date")
      .icon(Calendar01Icon)
      .build(),

    dtf
      .date()
      .id("issueDate")
      .accessor((b) => (b.issue_date ? parseDateOnly(b.issue_date) : new Date()))
      .displayName("Issue Date")
      .icon(Calendar01Icon)
      .build(),

    dtf
      .date()
      .id("paidDate")
      .accessor((b) => (b.paid_at ? new Date(b.paid_at) : new Date()))
      .displayName("Paid Date")
      .icon(Calendar01Icon)
      .build(),

    dtf
      .number()
      .id("amount")
      .accessor((b) => b.amount)
      .displayName("Amount")
      .icon(Wallet01Icon)
      .min(0)
      .max(1_000_000)
      .build(),

    dtf
      .option()
      .id("currency")
      .accessor((b) => b.currency)
      .displayName("Currency")
      .icon(FilterIcon)
      .options(currencies.map((c) => ({ value: c, label: c })))
      .build(),

    dtf
      .option()
      .id("source")
      .accessor((b) => b.source)
      .displayName("Source")
      .icon(InboxIcon)
      .options(SOURCE_OPTIONS)
      .build(),

    dtf
      .boolean()
      .id("overdue")
      .accessor((b) => isBillOverdue(b))
      .displayName("Overdue")
      .icon(Alert01Icon)
      .toggledStateName("Overdue")
      .build(),

    dtf
      .boolean()
      .id("matched")
      .accessor((b) => !!b.transaction_id)
      .displayName("Matched to a transaction")
      .icon(Link01Icon)
      .toggledStateName("Matched")
      .build(),
  ] as const;
}

// ── Matching ──────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD" for a filter value (a Date picked in the user's zone, or a string). */
function day(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string" && value) return value.slice(0, 10);
  return null;
}

function matchesDate(target: string | null, operator: string, values: unknown[]): boolean {
  const [a, b] = [day(values[0]), day(values[1])];
  if (!a) return true; // incomplete filter: ignore
  if (!target) return operator === "is not" || operator === "is not between";
  switch (operator) {
    case "is":
      return target === a;
    case "is not":
      return target !== a;
    case "is before":
      return target < a;
    case "is on or before":
      return target <= a;
    case "is after":
      return target > a;
    case "is on or after":
      return target >= a;
    case "is between":
      return b ? target >= a && target <= b : true;
    case "is not between":
      return b ? target < a || target > b : true;
    default:
      return true;
  }
}

function matchesNumber(target: number, operator: string, values: unknown[]): boolean {
  const a = Number(values[0]);
  const b = Number(values[1]);
  if (values[0] === undefined || isNaN(a)) return true;
  switch (operator) {
    case "is":
      return target === a;
    case "is not":
      return target !== a;
    case "is greater than":
      return target > a;
    case "is greater than or equal to":
      return target >= a;
    case "is less than":
      return target < a;
    case "is less than or equal to":
      return target <= a;
    case "is between":
      return isNaN(b) ? true : target >= a && target <= b;
    case "is not between":
      return isNaN(b) ? true : target < a || target > b;
    default:
      return true;
  }
}

function matchesOption(target: string, operator: string, values: unknown[]): boolean {
  if (values.length === 0) return true;
  const hit = (values as string[]).includes(target);
  return operator.startsWith("is not") || operator.startsWith("is none of") ? !hit : hit;
}

function matchesBoolean(target: boolean, operator: string, values: unknown[]): boolean {
  if (values.length === 0) return true;
  const hit = target === Boolean(values[0]);
  return operator === "is not" ? !hit : hit;
}

/** Does this bill pass every active filter? */
export function billMatchesFilters(bill: Bill, filters: FiltersState): boolean {
  return filters.every(({ columnId, operator, values }) => {
    switch (columnId) {
      case "dueDate":
        return matchesDate(bill.due_date, operator, values);
      case "issueDate":
        return matchesDate(bill.issue_date, operator, values);
      case "paidDate":
        return matchesDate(bill.paid_at ? day(new Date(bill.paid_at)) : null, operator, values);
      case "amount":
        return matchesNumber(bill.amount, operator, values);
      case "currency":
        return matchesOption(bill.currency, operator, values);
      case "source":
        return matchesOption(bill.source, operator, values);
      case "overdue":
        return matchesBoolean(isBillOverdue(bill), operator, values);
      case "matched":
        return matchesBoolean(!!bill.transaction_id, operator, values);
      default:
        return true;
    }
  });
}
