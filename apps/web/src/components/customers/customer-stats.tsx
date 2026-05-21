import { Card, CardContent } from "@travada-books/ui/components/card";
import { cn } from "@travada-books/ui/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  sub: string;
  subHighlight?: boolean;
};

function StatCard({ label, value, sub, subHighlight }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <p className="text-xl font-semibold tracking-tight">{value}</p>
          <div>
            <p className="text-sm">{label}</p>
            <p className={cn("mt-0.5 text-xs", subHighlight ? "text-destructive font-medium" : "text-muted-foreground")}>
              {sub}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type CustomerStatsProps = {
  totalCount: number;
  newThisMonth: number;
  totalOutstanding: number;
  topCustomer: { name: string; totalPaid: number } | undefined;
  overdueCount: number;
};

export function CustomerStats({
  totalCount,
  newThisMonth,
  totalOutstanding,
  topCustomer,
  overdueCount,
}: CustomerStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Total Customers"
        value={String(totalCount)}
        sub={newThisMonth > 0 ? `+${newThisMonth} added this month` : "No new customers this month"}
      />
      <StatCard
        label="Outstanding Balance"
        value={`KES ${totalOutstanding.toLocaleString("en-KE")}`}
        sub="Across all customers"
      />
      <StatCard
        label="Top Customer"
        value={topCustomer?.totalPaid > 0 ? topCustomer.name : "—"}
        sub={
          topCustomer?.totalPaid > 0
            ? `KES ${topCustomer.totalPaid.toLocaleString("en-KE")} paid`
            : "No payments recorded yet"
        }
      />
      <StatCard
        label="Overdue Customers"
        value={String(overdueCount)}
        sub={overdueCount > 0 ? "Have at least one overdue invoice" : "All customers up to date"}
        subHighlight={overdueCount > 0}
      />
    </div>
  );
}
