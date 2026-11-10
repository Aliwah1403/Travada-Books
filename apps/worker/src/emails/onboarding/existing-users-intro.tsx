import React from "react"
import { OnboardingEmail, P, Bullets, Cta, SignOff, FIRST_NAME, APP_URL } from "./components"

// One-off intro for people who signed up before the onboarding sequence existed.
// They never got the Day 0 welcome that sets up the series, so this goes out the day
// before their Day 1 email.

export const EXISTING_USERS_INTRO = {
  alias: "onboarding-00-existing-users-intro",
  subject: "Getting more out of Travada Books, one feature at a time",
  preview: "Over the next few weeks I'll show you what Travada Books can do, one short email at a time.",
}

export function ExistingUsersIntro() {
  return (
    <OnboardingEmail preview={EXISTING_USERS_INTRO.preview}>
      <P>Hi {FIRST_NAME},</P>
      <P>
        Curtis here, one of the founders of Travada Books. Thanks for being one of our early users.
        A lot has been built since you signed up, and some of it is easy to miss.
      </P>
      <P bold>
        So starting tomorrow, I'll send you a short email every couple of days, each one about a
        single feature and how to get the most out of it.
      </P>
      <P>Here's what's coming:</P>
      <Bullets
        items={[
          "Invoices and quotes",
          "M-Pesa payments from the invoice",
          "Recurring invoices and reminders",
          "Customer statements and portals",
          "Bank and M-Pesa statement imports",
          "Receipts and the Vault",
          "Your dashboard",
        ]}
      />
      <P>If you already use some of these, skim those ones.</P>
      <Cta href={APP_URL}>Open Travada Books →</Cta>
      <P>
        If anything is ever unclear, or there's something you wish Travada Books did, just reply.
        It comes straight to me and my co-founder Nate.
      </P>
      <SignOff signature />
    </OnboardingEmail>
  )
}
