import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { FlowConnectionIcon } from "@travada-books/ui/icons"
import { SankeyChart, SankeyLink, SankeyNode, SankeyTooltip, type SankeyData } from "@/components/charts/sankey"
import { TooltipContent } from "@/components/charts/tooltip/tooltip-content"
import { PROFIT_LOSS_NEGATIVE_COLOR, PROFIT_LOSS_POSITIVE_COLOR } from "@/components/charts/profit-loss-line"
import { ChartCard, ChartCardError } from "@/components/dashboard/chart-card"
import { EmptyState } from "@/components/shared/empty-state"
import { getMoneyFlow, PAYMENT_CHANNELS, type MoneyFlow } from "@/lib/queries/metrics-extended"
import { formatCurrency, formatCurrencyCompact } from "@/lib/format"

const STALE_TIME = 2 * 60 * 1000
const TITLE = "Money Flow"
const DESCRIPTION = "Where money came from and where it went"
/** Expense categories drawn individually; the rest fold into "Other spending". */
const TOP_CATEGORIES = 5
// Fixed height (not an aspect ratio): up to seven stacked labels per side need
// the same vertical room at every width. Below MIN_WIDTH the card scrolls
// sideways instead of squeezing labels into the links.
const CHART_HEIGHT = 360
const MIN_WIDTH = 640
const MARGIN = { top: 16, right: 190, bottom: 16, left: 130 }
const CENTRE_COLOR = "var(--chart-line-primary)"
const OTHER_COLOR = "var(--muted-foreground)"
const CATEGORY_FALLBACK_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-2)"]

type MoneyFlowChartProps = {
  orgId: string
  currency: string
  from: string
  to: string
  /** Currency to format/plot in — defaults to `currency` (the org's base currency). */
  displayCurrency?: string
  /** Multiplier applied to already-correct base-currency figures before display. Defaults to 1. */
  fxRate?: number
}

type FlowNode = {
  name: string
  category: "source" | "landing" | "outcome"
  color: string
  /** Display-currency amount through this node. */
  amount: number
  /** Plain-language share line for tooltips, e.g. "42% of money in". */
  shareLabel: string | null
}

function percent(part: number, whole: number): string {
  if (whole <= 0) return "0%"
  const value = (part / whole) * 100
  return value > 0 && value < 1 ? "<1%" : `${Math.round(value)}%`
}

/**
 * Left: money in by channel (+ "From savings" when spending outran income).
 * Centre: the business. Right: top expense categories, "Other spending", and
 * "Kept" when income outran spending — so both sides of the centre balance.
 */
function buildFlow(flow: MoneyFlow, fxRate: number): { nodes: FlowNode[]; data: SankeyData } {
  const income = flow.income * fxRate
  const expense = flow.expense * fxRate
  const nodes: FlowNode[] = []
  const links: SankeyData["links"] = []

  const sources: FlowNode[] = PAYMENT_CHANNELS.filter((c) => flow.channels[c.key] > 0).map((c) => ({
    name: c.key === "unspecified" ? "Other" : c.label,
    category: "source",
    color: c.color,
    amount: flow.channels[c.key] * fxRate,
    shareLabel: `${percent(flow.channels[c.key] * fxRate, income)} of money in`,
  }))
  if (expense > income) {
    const gap = expense - income
    sources.push({
      name: "From savings",
      category: "source",
      color: PROFIT_LOSS_NEGATIVE_COLOR,
      amount: gap,
      shareLabel: `Covered ${percent(gap, expense)} of spending`,
    })
  }

  const top = flow.categories.slice(0, TOP_CATEGORIES)
  const restTotal = flow.categories.slice(TOP_CATEGORIES).reduce((sum, c) => sum + c.amount, 0)
  const outcomes: FlowNode[] = top.map((c, i) => ({
    name: c.name.length > 22 ? `${c.name.slice(0, 21)}…` : c.name,
    category: "outcome",
    color: c.color ?? CATEGORY_FALLBACK_COLORS[i % CATEGORY_FALLBACK_COLORS.length]!,
    amount: c.amount * fxRate,
    shareLabel: `${percent(c.amount * fxRate, expense)} of spending`,
  }))
  if (restTotal > 0) {
    outcomes.push({
      name: "Other spending",
      category: "outcome",
      color: OTHER_COLOR,
      amount: restTotal * fxRate,
      shareLabel: `${percent(restTotal * fxRate, expense)} of spending`,
    })
  }
  if (income > expense) {
    const kept = income - expense
    outcomes.push({
      name: "Kept",
      category: "outcome",
      color: PROFIT_LOSS_POSITIVE_COLOR,
      amount: kept,
      shareLabel: `${percent(kept, income)} of money in`,
    })
  }

  nodes.push(...sources)
  const centreIndex = nodes.length
  nodes.push({
    name: "Your business",
    category: "landing",
    color: CENTRE_COLOR,
    amount: Math.max(income, expense),
    shareLabel: null,
  })
  sources.forEach((node, i) => links.push({ source: i, target: centreIndex, value: node.amount }))
  outcomes.forEach((node, i) => {
    nodes.push(node)
    links.push({ source: centreIndex, target: centreIndex + 1 + i, value: node.amount })
  })

  return {
    nodes,
    data: {
      nodes: nodes.map((n) => ({ name: n.name, category: n.category })),
      links,
    },
  }
}

export function MoneyFlowChart({
  orgId,
  currency,
  from,
  to,
  displayCurrency = currency,
  fxRate = 1,
}: MoneyFlowChartProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["metric", orgId, "money_flow", from, to],
    queryFn: () => getMoneyFlow(orgId, from, to),
    staleTime: STALE_TIME,
  })

  const flow = useMemo(() => (data ? buildFlow(data, fxRate) : null), [data, fxRate])

  if (isError) return <ChartCardError title={TITLE} icon={FlowConnectionIcon} onRetry={() => refetch()} />

  if (isLoading || !data || !flow) {
    return (
      <ChartCard title={TITLE} icon={FlowConnectionIcon} description={DESCRIPTION}>
        <div className="w-full animate-pulse rounded-md bg-muted" style={{ height: CHART_HEIGHT }} />
      </ChartCard>
    )
  }

  if (data.income <= 0 && data.expense <= 0) {
    return (
      <ChartCard title={TITLE} icon={FlowConnectionIcon}>
        <EmptyState icon={FlowConnectionIcon} title="No money in or out during this period" compact />
      </ChartCard>
    )
  }

  const { nodes } = flow
  const nodeColor = (_: unknown, index: number) => nodes[index]?.color ?? CENTRE_COLOR
  const income = data.income * fxRate
  const expense = data.expense * fxRate

  return (
    <ChartCard
      title={TITLE}
      icon={FlowConnectionIcon}
      description={DESCRIPTION}
      badge={
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCurrencyCompact(income, displayCurrency)} in · {formatCurrencyCompact(expense, displayCurrency)} out
        </span>
      }
    >
      <div className="-mx-1 overflow-x-auto px-1">
        <div style={{ minWidth: MIN_WIDTH, height: CHART_HEIGHT }}>
          <SankeyChart
            data={flow.data}
            aspectRatio="auto"
            className="h-full"
            margin={MARGIN}
            nodeWidth={12}
            nodePadding={30}
          >
            <SankeyLink getNodeColor={nodeColor} strokeOpacity={0.35} />
            <SankeyNode
              getNodeColor={nodeColor}
              formatValueLabel={(v) => formatCurrencyCompact(v, displayCurrency)}
            />
            <SankeyTooltip
              nodeContent={({ index }) => {
                const node = nodes[index]
                if (!node) return null
                return (
                  <TooltipContent
                    title={node.name}
                    rows={[
                      { color: node.color, label: "Amount", value: formatCurrency(node.amount, displayCurrency) },
                      ...(node.shareLabel ? [{ color: "transparent", label: "Share", value: node.shareLabel }] : []),
                    ]}
                  />
                )
              }}
              linkContent={({ link }) => {
                const sourceIndex = typeof link.source === "number" ? link.source : (link.source.index ?? 0)
                const targetIndex = typeof link.target === "number" ? link.target : (link.target.index ?? 0)
                const source = nodes[sourceIndex]
                const target = nodes[targetIndex]
                // Every link touches the centre; the other end carries the share.
                const outer = source?.category === "landing" ? target : source
                return (
                  <TooltipContent
                    title={`${source?.name ?? ""} → ${target?.name ?? ""}`}
                    rows={[
                      { color: outer?.color ?? CENTRE_COLOR, label: "Amount", value: formatCurrency(link.value, displayCurrency) },
                      ...(outer?.shareLabel ? [{ color: "transparent", label: "Share", value: outer.shareLabel }] : []),
                    ]}
                  />
                )
              }}
            />
          </SankeyChart>
        </div>
      </div>
    </ChartCard>
  )
}
