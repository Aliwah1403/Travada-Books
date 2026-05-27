import { Badge } from "@travada-books/ui/components/badge";
import { cn } from "@travada-books/ui/lib/utils";
import {
  type Icon,
  FileEditIcon,
  Sent02Icon,
  CheckmarkCircle01Icon,
  Alert01Icon,
  Cancel01Icon,
} from "@travada-books/ui/icons";

export type InvoiceStatus = "draft" | "unpaid" | "paid" | "overdue" | "canceled";

const statusConfig: Record<
  InvoiceStatus,
  { label: string; icon: Icon; className: string }
> = {
  draft: {
    label: "Draft",
    icon: FileEditIcon,
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
  unpaid: {
    label: "Sent",
    icon: Sent02Icon,
    className:
      "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  },
  paid: {
    label: "Paid",
    icon: CheckmarkCircle01Icon,
    className:
      "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  },
  overdue: {
    label: "Overdue",
    icon: Alert01Icon,
    className:
      "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  },
  canceled: {
    label: "Canceled",
    icon: Cancel01Icon,
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
};

type InvoiceStatusBadgeProps = {
  status: InvoiceStatus;
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const { icon: StatusIcon, label, className } = statusConfig[status];
  return (
    <Badge className={cn("border-0 font-medium rounded-md", className)}>
      <StatusIcon size={12} />
      {label}
    </Badge>
  );
}
