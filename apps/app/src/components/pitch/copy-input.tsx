import { useState } from "react"
import { toast } from "sonner"

import { Input } from "@travada-books/ui/components/input"
import { Button } from "@travada-books/ui/components/button"
import { Copy01Icon, TickIcon } from "@travada-books/ui/icons"

export function CopyInput({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success("Link copied")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <Input value={value} readOnly className="text-muted-foreground" />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleCopy}
        aria-label="Copy link"
      >
        {copied ? <TickIcon size={14} /> : <Copy01Icon size={14} />}
      </Button>
    </div>
  )
}
