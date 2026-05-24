import { Outlet, useLocation } from "react-router"
import { Sidebar } from "@/components/sidebar/sidebar"
import { Header } from "@/components/header/header"

const pageTitles: Record<string, string> = {
  "/invoices": "Invoices",
  "/invoices/create": "New Invoice",
  "/quotes": "Quotes",
  "/quotes/create": "New Quote",
  "/customers": "Customers",
}

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith("/invoices/")) return "Invoice"
  if (pathname.startsWith("/quotes/")) return "Quote"
  if (pathname.startsWith("/customers/")) return "Customer"
  if (pathname.startsWith("/settings")) return "Settings"
  if (pathname.startsWith("/account")) return "Account"
  return "Travada Books"
}

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={getTitle(pathname)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
