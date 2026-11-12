import { toast } from "sonner"

// ─── Assistant launcher seam ─────────────────────────────────────────────────
//
// Anything in the app that wants to open the assistant ("Ask Travada",
// "Ask about this") calls openAssistant(). It dispatches a window event the
// assistant UI will listen for:
//
//   window.addEventListener(OPEN_ASSISTANT_EVENT, (e) => {
//     const { prompt } = (e as CustomEvent<OpenAssistantDetail>).detail
//   })
//
// TODO(assistant): once the assistant panel listens for this event, drop the
// "coming soon" toast below.

export const OPEN_ASSISTANT_EVENT = "travada:open-assistant"

export type OpenAssistantDetail = { prompt?: string }

export function openAssistant(prompt?: string): void {
  window.dispatchEvent(new CustomEvent<OpenAssistantDetail>(OPEN_ASSISTANT_EVENT, { detail: { prompt } }))
  toast("The assistant is coming soon", {
    description: "You'll be able to ask Travada about your numbers right here.",
  })
}
