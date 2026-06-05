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

    // List contacts to find ID for this email, then remove by ID
    const { data: listData, error: listError } = await resend.contacts.list({ audienceId });
    if (listError) {
      logger.error("resend-remove-contact: list failed", { error: listError, email: payload.email });
      throw new Error(listError.message);
    }

    const contact = listData?.data?.find((c) => c.email === payload.email);
    if (!contact) {
      logger.info("resend-remove-contact: contact not found, nothing to remove", { email: payload.email });
      return { notFound: true };
    }

    const { error: removeError } = await resend.contacts.remove({ audienceId, id: contact.id });
    if (removeError) {
      logger.error("resend-remove-contact: remove failed", { error: removeError, email: payload.email });
      throw new Error(removeError.message);
    }

    logger.info("resend-remove-contact: removed", { email: payload.email });
    return { removed: true };
  },
});
