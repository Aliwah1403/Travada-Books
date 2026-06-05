import { task, logger } from "@trigger.dev/sdk";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const resendRemoveContact = task({
  id: "resend-remove-contact",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: { email: string }) => {
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      logger.warn("resend-remove-contact: RESEND_AUDIENCE_ID not set, skipping");
      return { skipped: true };
    }

    const { data: contact, error: getError } = await resend.contacts.get({ audienceId, email: payload.email });
    if (getError) {
      // 404-equivalent means the contact simply doesn't exist
      if ("statusCode" in getError && (getError as { statusCode: number }).statusCode === 404) {
        logger.info("resend-remove-contact: contact not found, nothing to remove");
        return { notFound: true };
      }
      logger.error("resend-remove-contact: get failed", { error: getError });
      throw new Error(getError.message);
    }
    if (!contact) {
      logger.info("resend-remove-contact: contact not found, nothing to remove");
      return { notFound: true };
    }

    const { error: removeError } = await resend.contacts.remove({ audienceId, id: contact.id });
    if (removeError) {
      logger.error("resend-remove-contact: remove failed", { error: removeError });
      throw new Error(removeError.message);
    }

    logger.info("resend-remove-contact: removed");
    return { removed: true };
  },
});
