import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"

import { Analytics } from "~/components/analytics"
import { Footer } from "~/components/footer"
import { Header } from "~/components/header"

import "./app.css"

// Applies dark/light before first paint from the OS preference, so there's
// no flash of the wrong theme. No toggle UI in Batch 1 — see
// components/theme-provider.tsx in apps/app for the full version.
const THEME_SCRIPT = `
  try {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
`

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-light-48x48.png"
          sizes="48x48"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-dark-48x48.png"
          sizes="48x48"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="shortcut icon"
          href="/favicon-light.ico"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="shortcut icon"
          href="/favicon-dark.ico"
          media="(prefers-color-scheme: dark)"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon-light.png"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon-dark.png"
          media="(prefers-color-scheme: dark)"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Analytics />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
