import { createBrowserRouter, RouterProvider, Navigate } from "react-router"

import { AnalyticsProvider } from "@/components/analytics-provider"
import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"
import { OnboardingLayout } from "@/layouts/onboarding-layout"
import { SettingsLayout } from "@/layouts/settings-layout"
import { AccountLayout } from "@/layouts/account-layout"

import { LoginPage } from "@/pages/auth/login"
import { SignupPage } from "@/pages/auth/signup"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password"
import { VerifyOtpPage } from "@/pages/auth/verify-otp"
import { ResetPasswordPage } from "@/pages/auth/reset-password"
import { InvoicesPage } from "@/pages/invoices/index"
import { CreateInvoicePage } from "@/pages/invoices/create"
import { EditInvoicePage } from "@/pages/invoices/edit"
import { InvoiceDetailPage } from "@/pages/invoices/detail"
import { QuotesPage } from "@/pages/quotes/index"
import { CreateQuotePage } from "@/pages/quotes/create"
import { QuoteDetailPage } from "@/pages/quotes/detail"
import { EditQuotePage } from "@/pages/quotes/edit"
import { CustomersPage } from "@/pages/customers/index"
import { CustomerDetailPage } from "@/pages/customers/detail"
import { PublicInvoicePage } from "@/pages/invoice-public/token"
import { PublicQuotePage } from "@/pages/quote-public/token"
import { QuoteConfirmedPage } from "@/pages/quote-public/confirmed"
import { StatementDetailPage } from "@/pages/statements/detail"
import { PublicStatementPage } from "@/pages/statement-public/token"

import { GeneralSettingsPage } from "@/pages/settings/general"
import { TeamSettingsPage } from "@/pages/settings/team"
import { IntegrationsSettingsPage } from "@/pages/settings/integrations"
import { BillingSettingsPage } from "@/pages/settings/billing"

import { ProfilePage } from "@/pages/account/profile"
import { SecurityPage } from "@/pages/account/security"
import { NotificationsPage } from "@/pages/account/notifications"
import { OnboardingOrgPage } from "@/pages/onboarding/org"
import { OnboardingInvitePage } from "@/pages/onboarding/invite"
import { AcceptInvitePage } from "@/pages/accept-invite"

const router = createBrowserRouter([
  {
    element: <AnalyticsProvider />,
    children: [
      {
        path: "/",
        element: <Navigate to="/invoices" replace />,
      },
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/signup", element: <SignupPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
          { path: "/forgot-password/verify", element: <VerifyOtpPage /> },
          { path: "/forgot-password/reset", element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <OnboardingLayout />,
        children: [
          { path: "/onboarding/org", element: <OnboardingOrgPage /> },
          { path: "/onboarding/invite", element: <OnboardingInvitePage /> },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          { path: "/invoices", element: <InvoicesPage /> },
          { path: "/invoices/create", element: <CreateInvoicePage /> },
          { path: "/invoices/:id/edit", element: <EditInvoicePage /> },
          { path: "/invoices/:id", element: <InvoiceDetailPage /> },
          { path: "/quotes", element: <QuotesPage /> },
          { path: "/quotes/create", element: <CreateQuotePage /> },
          { path: "/quotes/:id/edit", element: <EditQuotePage /> },
          { path: "/quotes/:id", element: <QuoteDetailPage /> },
          { path: "/customers", element: <CustomersPage /> },
          { path: "/customers/:id", element: <CustomerDetailPage /> },
          { path: "/statements/:id", element: <StatementDetailPage /> },
          {
            path: "/settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/settings/general" replace /> },
              { path: "general", element: <GeneralSettingsPage /> },
              { path: "team", element: <TeamSettingsPage /> },
              { path: "integrations", element: <IntegrationsSettingsPage /> },
              { path: "billing", element: <BillingSettingsPage /> },
            ],
          },
          {
            path: "/account",
            element: <AccountLayout />,
            children: [
              { index: true, element: <Navigate to="/account/profile" replace /> },
              { path: "profile", element: <ProfilePage /> },
              { path: "security", element: <SecurityPage /> },
              { path: "notifications", element: <NotificationsPage /> },
            ],
          },
        ],
      },
      {
        path: "/accept-invite",
        element: <AcceptInvitePage />,
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
        path: "/s/:token",
        element: <PublicStatementPage />,
      },
      {
        path: "/q/:token/confirmed",
        element: <QuoteConfirmedPage />,
      },
      {
        path: "/st/:token",
        element: <PublicStatementPage />,
      },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
