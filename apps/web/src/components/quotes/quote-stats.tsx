import { Card, CardContent } from "@travada-books/ui/components/card";

type StatCard = {
  label: string;
  amount: string;
  count: number;
};

type QuoteStatsProps = {
  open: StatCard;
  accepted: StatCard;
  expired: StatCard;
};

function StatCard({ label, amount, count }: StatCard) {
  return (
    <Card>
      <CardContent className='p-4'>
        <div className='flex justify-between flex-col gap-3'>
          <p className='text-xl font-semibold tracking-tight'>{amount}</p>
          <div>
            <p className='mt-1 text-sm'>{label}</p>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              {count === 0
                ? "No quotes"
                : `${count} quote${count !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuoteStats({ open, accepted, expired }: QuoteStatsProps) {
  return (
    <div className='grid grid-cols-3 gap-4'>
      <StatCard {...open} />
      <StatCard {...accepted} />
      <StatCard {...expired} />
    </div>
  );
}
