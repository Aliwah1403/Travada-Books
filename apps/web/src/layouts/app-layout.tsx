import { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Header } from "@/components/header/header";
import { WorkspaceLoadError } from "@/components/workspace-load-error";
import { AppLayoutSkeleton } from "@/components/app-layout-skeleton";
import { TransactionsVaultNudgeDialog } from "@/components/dashboard/transactions-vault-nudge-dialog";
import { useAuth } from "@/contexts/auth-context";
import { markTransactionsVaultNudgeSeen } from "@/lib/queries/profile";
import { useRealtime, useDebouncedCallback } from "@/hooks/use-realtime";
import { useInvalidateTransactionQueries } from "@/hooks/use-invalidate-transaction-queries";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/invoices": "Invoices",
  "/invoices/create": "New Invoice",
  "/quotes": "Quotes",
  "/quotes/create": "New Quote",
  "/customers": "Customers",
  "/transactions": "Transactions",
  "/vault": "Vault",
  "/inbox": "Inbox",
  "/settings": "Settings",
  "/account": "Account",
};

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/invoices/")) return "Invoice";
  if (pathname.startsWith("/quotes/")) return "Quote";
  if (pathname.startsWith("/customers/")) return "Customer";
  if (pathname.startsWith("/transactions/")) return "Transactions";
  if (pathname.startsWith("/vault/")) return "Vault";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/account")) return "Account";
  return "Travada Books";
}

export function AppLayout() {
  const { pathname } = useLocation();
  const { user, profile, loading, orgId, orgLoading, orgError, refreshOrg } =
    useAuth();
  const [nudgeOpen, setNudgeOpen] = useState(false);

  useEffect(() => {
    if (profile && !profile.transactions_vault_nudge_seen_at) {
      setNudgeOpen(true);
    }
  }, [profile]);

  // Org-wide backstop for the dashboard's metric queries: rows written by the
  // invoice-paid DB trigger, the CSV/PDF import worker, or any other
  // server-side writer never go through a client mutation, so nothing else
  // invalidates ["metric", orgId] for them. Mounted once here (AppLayout is a
  // stable parent that rarely re-renders) rather than on the transactions
  // page, so a user idling on the dashboard still sees fresh numbers.
  // Debounced ~1s to collapse CSV-import row storms into one refetch.
  const invalidateTransactionQueries = useInvalidateTransactionQueries();
  const debouncedInvalidateTransactions = useDebouncedCallback(
    invalidateTransactionQueries,
    1000,
  );
  // DELETE is deliberately omitted: with the default REPLICA IDENTITY, Postgres
  // only writes the primary key into the WAL record for a delete, so Supabase
  // can't evaluate the `org_id=eq.` filter and drops the event entirely — the
  // subscription would look like it covered deletes while silently never
  // firing. Every delete path in the app is a client mutation that already
  // calls useInvalidateTransactionQueries() directly, so nothing is lost.
  // Covering cross-tab deletes would need `ALTER TABLE public.transactions
  // REPLICA IDENTITY FULL`, which logs the full old row on every update too.
  useRealtime({
    channelName: "app-transactions",
    table: "transactions",
    events: ["INSERT", "UPDATE"],
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    onEvent: debouncedInvalidateTransactions,
  });

  function handleNudgeOpenChange(open: boolean) {
    setNudgeOpen(open);
    if (!open && user) {
      markTransactionsVaultNudgeSeen(user.id).catch(() => {});
    }
  }

  if (loading || orgLoading) return <AppLayoutSkeleton />;
  if (!user) return <Navigate to='/login' replace />;
  if (!orgId) {
    if (orgError) return <WorkspaceLoadError onRetry={refreshOrg} />;
    const pending = sessionStorage.getItem("pendingInviteToken");
    if (pending)
      return <Navigate to={`/accept-invite?token=${pending}`} replace />;
    return <Navigate to='/onboarding/org' replace />;
  }

  return (
    <div className='flex h-screen overflow-hidden'>
      <Sidebar />
      <div className='flex flex-1 flex-col overflow-hidden'>
        <Header title={getTitle(pathname)} />
        <main className='flex-1 overflow-y-auto'>
          <Outlet />
        </main>
      </div>
      <TransactionsVaultNudgeDialog
        open={nudgeOpen}
        onOpenChange={handleNudgeOpenChange}
      />
    </div>
  );
}
