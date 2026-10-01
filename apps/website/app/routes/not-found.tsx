import { NotFoundBody } from "~/components/not-found"
import { pageMeta } from "~/lib/seo"

// eslint-disable-next-line react-refresh/only-export-components -- route module convention: meta + default component
export function meta() {
  return pageMeta({
    title: "Page not found — Travada Books",
    description: "The page you're looking for doesn't exist or may have moved.",
    path: "/404",
    noindex: true,
  })
}

export default function NotFound() {
  return <NotFoundBody />
}
