import { Container } from "~/components/container"

export function NotFoundBody() {
  return (
    <Container className="py-24">
      <h1 className="text-3xl font-medium tracking-tight text-foreground">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you're looking for doesn't exist or may have moved.
      </p>
    </Container>
  )
}
