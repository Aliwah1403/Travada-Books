import { cn } from "@travada-books/ui/lib/utils";

const RING_CIRCUMFERENCE = 88;

type ChecklistProgressRingProps = {
  pct: number;
  className?: string;
  showLabel?: boolean;
};

export function ChecklistProgressRing({
  pct,
  className,
  showLabel,
}: ChecklistProgressRingProps) {
  return (
    <div className={cn("relative", className)}>
      <svg className='size-full -rotate-90' viewBox='0 0 36 36'>
        <circle
          cx='18'
          cy='18'
          r='14'
          fill='none'
          strokeWidth='3'
          className='stroke-foreground/10'
        />
        <circle
          cx='18'
          cy='18'
          r='14'
          fill='none'
          strokeWidth='3'
          strokeLinecap='round'
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE - (pct / 100) * RING_CIRCUMFERENCE}
          className='stroke-foreground transition-[stroke-dashoffset] duration-200 [transition-timing-function:var(--ease-out)]'
        />
      </svg>
      {showLabel && (
        <span className='absolute inset-0 flex items-center justify-center font-mono text-[0.625rem]'>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
