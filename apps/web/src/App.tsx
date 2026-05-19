import { createBrowserRouter, RouterProvider, Navigate } from "react-router"

import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"

import { LoginPage } from "@/pages/auth/login"
import { SignupPage } from "@/pages/auth/signup"
import { InvoicesPage } from "@/pages/invoices/index"
import { CreateInvoicePage } from "@/pages/invoices/create"
import { InvoiceDetailPage } from "@/pages/invoices/detail"
import { CustomersPage } from "@/pages/customers/index"
import { CustomerDetailPage } from "@/pages/customers/detail"
import { SettingsPage } from "@/pages/settings/index"
import { PublicInvoicePage } from "@/pages/invoice-public/token"

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
      { path: "/customers", element: <CustomersPage /> },
      { path: "/customers/:id", element: <CustomerDetailPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "/i/:token",
    element: <PublicInvoicePage />,
  },
])

export function App() {
  return <RouterProvider router={router} />
}
