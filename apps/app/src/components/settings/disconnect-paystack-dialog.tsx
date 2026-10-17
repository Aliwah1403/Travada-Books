import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@travada-books/ui/components/alert-dialog"
import { useAuth } from "@/contexts/auth-context"
import { disconnectPaystack } from "@/lib/queries/payment-accounts"

// Shared by the integrations gallery card and the Paystack detail page.
export function DisconnectPaystackDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { orgId } = useAuth()
  const queryClient = useQueryClient()

  function handleDisconnect() {
    toast.promise(
      disconnectPaystack().then(() =>
        queryClient.invalidateQueries({ queryKey: ["payment-account", orgId] }),
      ),
      {
        loading: "Disconnecting…",
        success: "M-Pesa payments disconnected.",
        error: (e) => (e instanceof Error ? e.message : "Something went wrong. Please try again."),
      },
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect M-Pesa payments?</AlertDialogTitle>
          <AlertDialogDescription>
            Customers won't be able to pay your invoices online. Any payout that's still pending is
            held until you reconnect.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              handleDisconnect()
              onOpenChange(false)
            }}
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
