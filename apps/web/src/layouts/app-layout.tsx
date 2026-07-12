import { Outlet, useLocation, Navigate } from "react-router";
import { Sidebar } from "@/components/sidebar/sidebar";
import { Header } from "@/components/header/header";
import { WorkspaceLoadError } from "@/components/workspace-load-error";
import { AppLayoutSkeleton } from "@/components/app-layout-skeleton";
import { useAuth } from "@/contexts/auth-context";

const pageTitles: Record<string, string> = {
  "/invoices": "Invoices",
  "/invoices/create": "New Invoice",
  "/quotes": "Quotes",
  "/quotes/create": "New Quote",
  "/customers": "Customers",
  "/transactions": "Transactions",
  "/vault": "Vault",
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
  const { user, loading, orgId, orgLoading, orgError, refreshOrg } = useAuth();

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
    </div>
  );
}
