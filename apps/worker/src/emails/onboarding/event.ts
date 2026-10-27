// Resend event that starts the onboarding automation. Kept apart from automation.ts so
// the signup task can import it without pulling in every email template.
export const ONBOARDING_TRIGGER_EVENT = "user.signed_up"
