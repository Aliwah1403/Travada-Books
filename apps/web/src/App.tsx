import { createBrowserRouter, RouterProvider, Navigate } from "react-router"

import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"

import { LoginPage } from "@/pages/auth/login"
import { SignupPage } from "@/pages/auth/signup"
import { InvoicesPage } from "@/pages/invoices/index"
import { CreateInvoicePage } from "@/pages/invoices/create"
import { InvoiceDetailPage } from "@/pages/invoices/detail"
import { QuotesPage } from "@/pages/quotes/index"
import { CreateQuotePage } from "@/pages/quotes/create"
import { QuoteDetailPage } from "@/pages/quotes/detail"
import { CustomersPage } from "@/pages/customers/index"
import { CustomerDetailPage } from "@/pages/customers/detail"
import { SettingsPage } from "@/pages/settings/index"
import { PublicInvoicePage } from "@/pages/invoice-public/token"
import { PublicQuotePage } from "@/pages/quote-public/token"
import { QuoteConfirmedPage } from "@/pages/quote-public/confirmed"
import { StatementDetailPage } from "@/pages/statements/detail"
import { PublicStatementPage } from "@/pages/statement-public/token"

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/invoices" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: "/invoices", element: <InvoicesPage /> },
      { path: "/invoices/create", element: <CreateInvoicePage /> },
      { path: "/invoices/:id", element: <InvoiceDetailPage /> },
      { path: "/quotes", element: <QuotesPage /> },
      { path: "/quotes/create", element: <CreateQuotePage /> },
      { path: "/quotes/:id", element: <QuoteDetailPage /> },
      { path: "/customers", element: <CustomersPage /> },
      { path: "/customers/:id", element: <CustomerDetailPage /> },
      { path: "/statements/:id", element: <StatementDetailPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "/i/:token",
    element: <PublicInvoicePage />,
  },
  {
    path: "/q/:token",
    element: <PublicQuotePage />,
  },
  {
    path: "/q/:token/confirmed",
    element: <QuoteConfirmedPage />,
  },
  {
    path: "/st/:token",
    element: <PublicStatementPage />,
  },
])

export function App() {
  return <RouterProvider router={router} />
}
