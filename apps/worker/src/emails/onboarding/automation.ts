import { ONBOARDING_SEQUENCE } from "./sequence"
import { ONBOARDING_TRIGGER_EVENT } from "./event"

// Shape of the Resend automation graph for the onboarding sequence.
// See https://resend.com/docs/api-reference/automations

export { ONBOARDING_TRIGGER_EVENT }
// Same verified sending domain as every other worker email; replies go to both founders,
// like the Day 0 welcome. Automation steps only accept reply_to as one string.
export const ONBOARDING_FROM = `Curtis at Travada Books <${process.env.FROM_EMAIL ?? "noreply@mail.travadasys.com"}>`
export const ONBOARDING_REPLY_TO = "curtis.aliwah@travadasys.com, nate.muliro@travadasys.com"

type Step =
  | { key: string; type: "trigger"; config: { event_name: string } }
  | { key: string; type: "delay"; config: { duration: string } }
  | {
      key: string
      type: "send_email"
      config: { template: { id: string }; subject: string; from: string; reply_to: string }
    }
type Connection = { from: string; to: string; type?: "default" }

/**
 * Builds a straight line: trigger → (delay → send)×N. Everyone gets every email.
 * The trigger fires at signup, after the Day 0 welcome has gone out from on-user-signup.
 * `templateIds` maps each step's alias to its published Resend template id.
 */
export function buildOnboardingAutomation(templateIds: Record<string, string>) {
  const steps: Step[] = [{ key: "trigger", type: "trigger", config: { event_name: ONBOARDING_TRIGGER_EVENT } }]
  const connections: Connection[] = []
  let previous = "trigger"

  const add = (step: Step) => {
    steps.push(step)
    connections.push({ from: previous, to: step.key })
    previous = step.key
  }

  for (const email of ONBOARDING_SEQUENCE) {
    const templateId = templateIds[email.alias]
    if (!templateId) throw new Error(`No Resend template id for ${email.alias}`)

    add({ key: `wait_before_${email.key}`, type: "delay", config: { duration: email.delay } })
    add({
      key: `send_${email.key}`,
      type: "send_email",
      config: {
        template: { id: templateId },
        subject: email.subject,
        from: ONBOARDING_FROM,
        reply_to: ONBOARDING_REPLY_TO,
      },
    })
  }

  return { name: "Onboarding sequence", steps, connections }
}
