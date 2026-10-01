import { Badge } from "@travada-books/ui/components/badge";
import { cn } from "@travada-books/ui/lib/utils";
import {
  type Icon,
  FileEditIcon,
  Sent02Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Clock01Icon,
} from "@travada-books/ui/icons";

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

const statusConfig: Record<
  QuoteStatus,
  { label: string; icon: Icon; className: string }
> = {
  draft: {
    label: "Draft",
    icon: FileEditIcon,
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
  sent: {
    label: "Sent",
    icon: Sent02Icon,
    className:
      "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  accepted: {
    label: "Accepted",
    icon: CheckmarkCircle01Icon,
    className:
      "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  declined: {
    label: "Declined",
    icon: Cancel01Icon,
    className:
      "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  expired: {
    label: "Expired",
    icon: Clock01Icon,
    className:
      "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

type QuoteStatusBadgeProps = {
  status: QuoteStatus;
};

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const { icon: StatusIcon, label, className } = statusConfig[status];
  return (
    <Badge className={cn("border-0 font-medium rounded-md", className)}>
      <StatusIcon size={12} />
      {label}
    </Badge>
  );
}
