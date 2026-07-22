import { Toaster as SonnerToaster, toast, type ToasterProps } from "sonner"

import { cn } from "../lib/utils"
import { buttonVariants } from "./button"
import { Spokes } from "./spokes"
import { Alert01Icon, Alert02Icon, Cancel01Icon, CheckmarkCircle01Icon } from "../icons"

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      gap={8}
      offset={16}
      visibleToasts={3}
      duration={4000}
      closeButton
      icons={{
        success: (
          <CheckmarkCircle01Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
        ),
        error: <Alert01Icon className="size-4 text-red-700 dark:text-red-400" />,
        warning: <Alert02Icon className="size-4 text-amber-600 dark:text-amber-400" />,
        loading: <Spokes className="size-4 text-muted-foreground" />,
        close: <Cancel01Icon className="size-3" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            "group/toast pointer-events-auto relative flex w-(--width) items-start gap-2.5",
            // pr-7 (not p-3 all round) reserves room on the right so the absolutely
            // positioned hover close button never overlaps the action/cancel buttons
            "rounded-lg bg-popover p-3 pr-7 font-sans text-xs/relaxed text-popover-foreground",
            "shadow-md ring-1 ring-foreground/10",
            // shorten sonner's default 400ms transition (never transition-all)
            "[transition:transform_200ms_var(--ease-out),opacity_150ms_ease-out,height_200ms_var(--ease-out)]"
          ),
          // relative: sonner wraps icons.loading in an internal `.sonner-loader` div
          // (position:absolute; top/left:50%) — without a positioned ancestor here it
          // centers against the toast root instead of this icon slot
          icon: "relative mt-0.5 flex size-4 shrink-0 items-center justify-center [&_svg]:size-4",
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "font-heading text-xs font-medium text-foreground",
          description: "text-xs/relaxed text-muted-foreground",
          actionButton: cn(
            buttonVariants({ variant: "default", size: "sm" }),
            "ml-auto shrink-0 self-center"
          ),
          cancelButton: cn(
            buttonVariants({ variant: "outline", size: "xs" }),
            "shrink-0 self-center"
          ),
          closeButton: cn(
            // hover-reveal close, ghost treatment; sonner's default positioning vars only
            // apply under [data-styled='true'], so unstyled toasts get no positioning unless
            // we set it ourselves here
            "absolute top-2 right-2 flex size-5 items-center justify-center rounded-md",
            "text-muted-foreground fine-hover:text-foreground fine-hover:bg-muted",
            "opacity-0 transition-opacity group-hover/toast:opacity-100 focus-visible:opacity-100"
          ),
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
