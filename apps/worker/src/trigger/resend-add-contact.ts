import { schemaTask, logger, AbortTaskRunError } from "@trigger.dev/sdk";
import { z } from "zod";
import { resend, hashEmail, isResendClientError } from "../lib/resend";
import { ONBOARDING_TRIGGER_EVENT } from "../emails/onboarding/event";

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

/**
 * Adds a new signup to the Resend audience, then fires the signup event that starts
 * the onboarding automation. The contact is created first so the automation's emails
 * can greet them by first name. A retry after the event failed finds the contact
 * already there and goes straight on to sending the event.
 */
export const resendAddContact = schemaTask({
  id: "resend-add-contact",
  schema,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
    randomize: true,
  },
  run: async (payload) => {
    const emailHash = hashEmail(payload.email);
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    let contactId: string | undefined;

    if (!audienceId) {
      logger.warn("resend-add-contact: RESEND_AUDIENCE_ID not set, skipping contact create");
    } else {
      const { data, error } = await resend.contacts.create({
        audienceId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        unsubscribed: false,
      });

      if (error) {
        // A retried run lands here when the contact was created on an earlier attempt.
        const existing = await resend.contacts.get({ audienceId, email: payload.email });
        if (existing.data) {
          contactId = existing.data.id;
          logger.info("resend-add-contact: contact already exists", { id: contactId, emailHash });
        } else {
          logger.error("resend-add-contact: failed", { error, emailHash });
          if (isResendClientError(error.name)) {
            throw new AbortTaskRunError(error.message);
          }
          throw new Error(error.message);
        }
      } else {
        contactId = data?.id;
        logger.info("resend-add-contact: added", { id: contactId, emailHash });
      }
    }

    // The worker's resend SDK (v4) predates events, so call the API directly.
    const res = await fetch("https://api.resend.com/events/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: ONBOARDING_TRIGGER_EVENT, email: payload.email }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("resend-add-contact: signup event failed", { status: res.status, body, emailHash });
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new AbortTaskRunError(`Resend events/send ${res.status}: ${body}`);
      }
      throw new Error(`Resend events/send ${res.status}: ${body}`);
    }

    logger.info("resend-add-contact: signup event sent", { event: ONBOARDING_TRIGGER_EVENT, emailHash });
    return { id: contactId, event: ONBOARDING_TRIGGER_EVENT };
  },
});
