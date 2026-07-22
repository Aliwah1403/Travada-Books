import { schemaTask, logger, AbortTaskRunError } from "@trigger.dev/sdk";
import { z } from "zod";
import { resend, hashEmail, isResendClientError } from "../lib/resend";

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

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
      logger.error("resend-add-contact: failed", { error, emailHash: hashEmail(payload.email) });
      if (isResendClientError(error.name)) {
        throw new AbortTaskRunError(error.message);
      }
      throw new Error(error.message);
    }

    logger.info("resend-add-contact: added", { id: data?.id, emailHash: hashEmail(payload.email) });
    return { id: data?.id };
  },
});
