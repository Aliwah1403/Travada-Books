import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"

import { Analytics } from "~/components/analytics"
import { Footer } from "~/components/footer"
import { Header } from "~/components/header"
import { Frame } from "~/components/site/frame"

import "./app.css"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
      <body className="bg-canvas font-sans text-ink antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <Frame className="bg-canvas text-ink">
      <Analytics />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </Frame>
  )
}
