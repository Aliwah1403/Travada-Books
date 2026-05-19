import { Outlet } from "react-router"

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
          <span className="text-sm font-bold">TB</span>
        </div>
        <span className="text-base font-semibold">Travada Books</span>
      </div>

      <div className="w-full max-w-sm">
        <Outlet />
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href="https://travadasys.com"
          className="underline underline-offset-4 hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          Travada Systems
        </a>
      </p>
    </div>
  )
}
