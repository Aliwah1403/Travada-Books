import { task, logger } from "@trigger.dev/sdk";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const resendAddContact = task({
  id: "resend-add-contact",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: { email: string; firstName?: string; lastName?: string }) => {
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      logger.warn("resend-add-contact: RESEND_AUDIENCE_ID not set, skipping");
      return { skipped: true };
    }

    const { data, error } = await resend.contacts.create({
      audienceId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      unsubscribed: false,
    });

    if (error) {
      logger.error("resend-add-contact: failed", { error, email: payload.email });
      throw new Error(error.message);
    }

    logger.info("resend-add-contact: added", { id: data?.id, email: payload.email });
    return { id: data?.id };
  },
});
