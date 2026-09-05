import { useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { finishInboxConnect } from "@/lib/queries/inbox"

export function InboxOAuthCompletePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      navigate(`/inbox?error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    if (!code || !state) {
      navigate("/inbox?error=no_code", { replace: true })
      return
    }

    finishInboxConnect(code, state)
      .then((result) => navigate(`/inbox?connected=${result.provider}`, { replace: true }))
      .catch((err: Error) => navigate(`/inbox?error=${encodeURIComponent(err.message)}`, { replace: true }))
  }, [searchParams, navigate])

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
      <p className="text-sm text-muted-foreground">Connecting your mailbox…</p>
    </div>
  )
}
