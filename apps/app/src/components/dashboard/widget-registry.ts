import type { ComponentType } from "react"
import {
  Alert02Icon,
  Invoice01Icon,
  ChartLineData01Icon,
  MoneyExchange01Icon,
  MoneyBag02Icon,
  SafeIcon,
  UserStar01Icon,
  PieChartIcon,
  ReceiptTextIcon,
  RepeatIcon,
  ProfitIcon,
  TargetIcon,
  UserRemoveIcon,
  TaxesIcon,
  QuoteIcon,
  VaultIcon,
  type Icon,
} from "@travada-books/ui/icons"
import { type RevenueType } from "@/lib/queries/metrics"
import { OverdueInvoicesWidget } from "@/components/dashboard/widgets/overdue-invoices-widget"
import { OutstandingInvoicesWidget } from "@/components/dashboard/widgets/outstanding-invoices-widget"
import { RevenueWidget } from "@/components/dashboard/widgets/revenue-widget"
import { CashFlowWidget } from "@/components/dashboard/widgets/cash-flow-widget"
import { BurnRateWidget } from "@/components/dashboard/widgets/burn-rate-widget"
import { CashCushionWidget } from "@/components/dashboard/widgets/cash-cushion-widget"
import { TopCustomerWidget } from "@/components/dashboard/widgets/top-customer-widget"
import { CategoryExpensesWidget } from "@/components/dashboard/widgets/category-expenses-widget"
import { MonthlySpendingWidget } from "@/components/dashboard/widgets/monthly-spending-widget"
import { RecurringExpensesWidget } from "@/components/dashboard/widgets/recurring-expenses-widget"
import { ProfitLossWidget } from "@/components/dashboard/widgets/profit-loss-widget"
import { PaymentScoreWidget } from "@/components/dashboard/widgets/payment-score-widget"
import { CustomerChurnWidget } from "@/components/dashboard/widgets/customer-churn-widget"
import { TaxSummaryWidget } from "@/components/dashboard/widgets/tax-summary-widget"
import { QuotesPipelineWidget } from "@/components/dashboard/widgets/quotes-pipeline-widget"
import { VaultActivityWidget } from "@/components/dashboard/widgets/vault-activity-widget"

export type WidgetKey =
  | "overdue-invoices"
  | "outstanding-invoices"
  | "revenue"
  | "cash-flow"
  | "burn-rate"
  | "cash-cushion"
  | "top-customer"
  | "category-expenses"
  | "monthly-spending"
  | "recurring-expenses"
  | "profit-loss"
  | "payment-score"
  | "customer-churn"
  | "tax-summary"
  | "quotes-pipeline"
  | "vault-activity"

/**
 * Superset of every widget's own prop shape. Widgets narrower than this
 * (e.g. VaultActivityWidget only needs `orgId`) simply ignore the extra
 * keys — TypeScript does not excess-property-check a spread, only object
 * literals, so `<Component {...renderProps} />` compiles cleanly here.
 */
export type WidgetRenderProps = {
  orgId: string
  currency: string
  from: string
  to: string
  revenueType: RevenueType
  displayCurrency: string
  fxRate: number
}

type WidgetRegistryEntry = {
  label: string
  icon: Icon
  component: ComponentType<WidgetRenderProps>
}

export const WIDGET_REGISTRY: Record<WidgetKey, WidgetRegistryEntry> = {
  "overdue-invoices": {
    label: "Overdue Invoices",
    icon: Alert02Icon,
    component: OverdueInvoicesWidget,
  },
  "outstanding-invoices": {
    label: "Outstanding Invoices",
    icon: Invoice01Icon,
    component: OutstandingInvoicesWidget,
  },
  revenue: {
    label: "Revenue",
    icon: ChartLineData01Icon,
    component: RevenueWidget,
  },
  "cash-flow": {
    label: "Cash Flow",
    icon: MoneyExchange01Icon,
    component: CashFlowWidget,
  },
  "burn-rate": {
    label: "Burn Rate",
    icon: MoneyBag02Icon,
    component: BurnRateWidget,
  },
  "cash-cushion": {
    label: "Cash Cushion",
    icon: SafeIcon,
    component: CashCushionWidget,
  },
  "top-customer": {
    label: "Top Customer",
    icon: UserStar01Icon,
    component: TopCustomerWidget,
  },
  "category-expenses": {
    label: "Top Expense Categories",
    icon: PieChartIcon,
    component: CategoryExpensesWidget,
  },
  "monthly-spending": {
    label: "Monthly Spending",
    icon: ReceiptTextIcon,
    component: MonthlySpendingWidget,
  },
  "recurring-expenses": {
    label: "Fixed Costs",
    icon: RepeatIcon,
    component: RecurringExpensesWidget,
  },
  "profit-loss": {
    label: "Profit & Loss",
    icon: ProfitIcon,
    component: ProfitLossWidget,
  },
  "payment-score": {
    label: "Payment Score",
    icon: TargetIcon,
    component: PaymentScoreWidget,
  },
  "customer-churn": {
    label: "Customer Churn",
    icon: UserRemoveIcon,
    component: CustomerChurnWidget,
  },
  "tax-summary": {
    label: "Tax Summary",
    icon: TaxesIcon,
    component: TaxSummaryWidget,
  },
  "quotes-pipeline": {
    label: "Quotes Pipeline",
    icon: QuoteIcon,
    component: QuotesPipelineWidget,
  },
  "vault-activity": {
    label: "Vault Activity",
    icon: VaultIcon,
    component: VaultActivityWidget,
  },
}

export const WIDGET_KEYS = Object.keys(WIDGET_REGISTRY) as WidgetKey[]

/** The Phase 1 seven widgets — used as the fallback only when a user has
 * no saved preferences row yet. A saved layout that shrinks below
 * `NUMBER_OF_WIDGETS` (because unknown/removed keys were filtered out) is
 * left as-is rather than backfilled — a shorter primary list is fine. */
export const DEFAULT_PRIMARY_WIDGETS: WidgetKey[] = [
  "overdue-invoices",
  "outstanding-invoices",
  "revenue",
  "cash-flow",
  "burn-rate",
  "cash-cushion",
  "top-customer",
]

/** Max number of primary widgets visible on Overview at any time. */
export const NUMBER_OF_WIDGETS = 7

export function isWidgetKey(key: string): key is WidgetKey {
  return Object.prototype.hasOwnProperty.call(WIDGET_REGISTRY, key)
}
