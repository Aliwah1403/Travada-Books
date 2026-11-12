// Side effects that run *after* a service's transaction commits: emails,
// notifications and background jobs. Kept behind one interface so services
// stay testable (tests pass a recording fake) and so a failure here never
// rolls back the database write it follows — the invoice already records
// email_status, so a failed send is visible and retryable.
//
// The edge functions accept the API as a trusted internal caller, the same
// way the Trigger.dev worker calls them (API-WRITES-PLAN.md D6):
//   send-invoice-email, send-invoice-reminder,
//   send-quote-email                          → service-role bearer
//   notify-invoice-paid                       → X-Worker-Secret
// Scheduled sends go straight to Trigger.dev, as trigger-scheduled-send does.

export type Effects = {
  /** Emails a sent invoice. `queued` = a PDF is being generated first. */
  sendInvoiceEmail(invoiceId: string): Promise<{ queued: boolean }>
  sendInvoiceReminder(invoiceId: string): Promise<void>
  /** "Invoice paid" business notification (email + in-app, per prefs). */
  notifyInvoicePaid(invoiceId: string): Promise<void>
  /** Queues the Trigger.dev job that sends a scheduled invoice. */
  scheduleInvoiceSend(invoiceId: string, scheduledAt: string): Promise<void>
  /** Emails a sent quote. `queued` = a PDF is being generated first. */
  sendQuoteEmail(quoteId: string): Promise<{ queued: boolean }>
}

export type EffectsConfig = {
  supabaseUrl: string
  serviceRoleKey: string
  /** WORKER_SHARED_SECRET — needed for notify-invoice-paid. */
  workerSecret?: string
  /** TRIGGER_SECRET_KEY — needed for scheduled sends. */
  triggerSecretKey?: string
}

export class EffectError extends Error {}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 15_000) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const text = await res.text()
  if (!res.ok) throw new EffectError(`${url.split("/").pop()} failed (${res.status}): ${text.slice(0, 200)}`)
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function createEffects(config: EffectsConfig): Effects {
  const fn = (name: string) => `${config.supabaseUrl}/functions/v1/${name}`
  const asService = { Authorization: `Bearer ${config.serviceRoleKey}` }

  return {
    async sendInvoiceEmail(invoiceId) {
      const data = await postJson(fn("send-invoice-email"), asService, { invoiceId })
      return { queued: data.queued === true }
    },

    async sendInvoiceReminder(invoiceId) {
      await postJson(fn("send-invoice-reminder"), asService, { invoiceId })
    },

    async notifyInvoicePaid(invoiceId) {
      if (!config.workerSecret) {
        console.warn("[effects] WORKER_SHARED_SECRET not set; skipping notify-invoice-paid")
        return
      }
      await postJson(fn("notify-invoice-paid"), { ...asService, "X-Worker-Secret": config.workerSecret }, { invoiceId })
    },

    async scheduleInvoiceSend(invoiceId, scheduledAt) {
      if (!config.triggerSecretKey) {
        throw new EffectError("TRIGGER_SECRET_KEY not set; can't queue the scheduled send")
      }
      await postJson(
        "https://api.trigger.dev/api/v1/tasks/scheduled-send/trigger",
        { Authorization: `Bearer ${config.triggerSecretKey}` },
        {
          payload: { invoiceId, scheduledAt },
          // Same key as trigger-scheduled-send, so the two paths never double-queue.
          options: { idempotencyKey: `scheduled-send:${invoiceId}`, idempotencyKeyTTL: "7d" },
        },
        10_000,
      )
    },

    async sendQuoteEmail(quoteId) {
      const data = await postJson(fn("send-quote-email"), asService, { quoteId })
      return { queued: data.queued === true }
    },
  }
}
