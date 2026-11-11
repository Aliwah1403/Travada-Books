import type { ReactNode } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@travada-books/ui/components/avatar";
import { cn } from "@travada-books/ui/lib/utils";

/**
 * Phone-width stand-in for a data table: one tappable card per row. Render it
 * with `md:hidden` next to the table (wrapped in `hidden md:block`) and feed it
 * the table's own row model, so search, filters and sort carry over.
 */
export function MobileList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col divide-y rounded-lg border md:hidden", className)}>
      {children}
    </ul>
  );
}

export function MobileListItem({
  avatarName,
  avatarUrl,
  title,
  subtitle,
  amount,
  badge,
  onClick,
}: {
  /** Name the avatar's two-letter fallback is taken from. */
  avatarName: string;
  avatarUrl?: string | null;
  title: ReactNode;
  subtitle?: ReactNode;
  amount?: ReactNode;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type='button'
        onClick={onClick}
        className='flex w-full items-center gap-3 px-3 py-3 text-left transition-opacity active:opacity-80'
      >
        <Avatar className='size-8 shrink-0'>
          <AvatarImage src={avatarUrl ?? undefined} />
          <AvatarFallback className='text-[10px]'>
            {avatarName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <span className='truncate text-sm font-medium'>{title}</span>
          {subtitle && (
            <span className='truncate text-xs text-muted-foreground'>
              {subtitle}
            </span>
          )}
        </div>
        {(amount || badge) && (
          <div className='flex shrink-0 flex-col items-end gap-1'>
            {amount && (
              <span className='text-sm font-medium tabular-nums'>{amount}</span>
            )}
            {badge}
          </div>
        )}
      </button>
    </li>
  );
}
