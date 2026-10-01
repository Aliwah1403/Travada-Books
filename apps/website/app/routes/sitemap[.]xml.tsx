import { absoluteSitemapUrl, getSitemapUrls } from "~/lib/sitemap"

// Resource route (no default export — see the isResourceRoute check in
// @react-router/dev's static prerender) so the loader's raw body gets
// written straight to build/client/sitemap.xml instead of index.html.
export function loader() {
  const urls = getSitemapUrls()
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((url) => {
    const loc = absoluteSitemapUrl(url.path)
    const lastmod = url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : ""
    return `  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`
  })
  .join("\n")}
</urlset>
`

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  })
}
