import { SITE_URL } from "~/data/site"

// Resource route — see sitemap[.]xml.tsx for why there's no default export.
export function loader() {
  const body = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  })
}
