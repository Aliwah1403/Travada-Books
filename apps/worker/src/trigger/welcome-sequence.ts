import React from "react";
import { schemaTask, wait, retry, logger, idempotencyKeys, AbortTaskRunError } from "@trigger.dev/sdk";
import { render } from "@react-email/render";
import { createHmac } from "node:crypto";
import { z } from "zod";
import { resend, FROM_EMAIL, hashEmail, isResendClientError } from "../lib/resend";
import { WelcomeDay2Email } from "../emails/welcome-day2";
import { WelcomeDay5Email } from "../emails/welcome-day5";
import { WelcomeDay14Email } from "../emails/welcome-day14";

// Matches the reply-to used for the Day 0 welcome email sent by on-user-signup.
const REPLY_TO = ["curtis.aliwah@travadasys.com", "nate.muliro@travadasys.com"];

const schema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  userId: z.string().uuid().optional(),
});

type Step = {
  key: string;
  /** Gap since the PREVIOUS send (or since task start for the first step), not an absolute day offset. */
  gapDays: number;
  subject: string;
  Template: (props: { firstName?: string; unsubscribeUrl: string }) => React.ReactElement;
};

const STEPS: Step[] = [
  {
    key: "day2",
    gapDays: 2,
    subject: "How getting paid works on Travada Books",
    Template: WelcomeDay2Email,
  },
  {
    key: "day5",
    gapDays: 3,
    subject: "Have you sent your first invoice yet?",
    Template: WelcomeDay5Email,
  },
  {
    key: "day14",
    gapDays: 9,
    subject: "Two weeks in — how's it going?",
    Template: WelcomeDay14Email,
  },
];

/**
 * Builds a signed unsubscribe URL pointing at the `unsubscribe` Supabase edge function.
 * A bare `?email=` param would let anyone unsubscribe anyone, so the email is HMAC-signed
 * with the shared worker secret; the edge function verifies the signature before acting.
 */
function buildUnsubscribeUrl(email: string): string {
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const e = Buffer.from(email).toString("base64url");
  const s = createHmac("sha256", process.env.WORKER_SHARED_SECRET!).update(email).digest("hex");
  return `${SUPABASE_URL}/functions/v1/unsubscribe?e=${e}&s=${s}`;
}

/**
 * Checks whether the contact has unsubscribed from the audience before sending the next
 * step in the sequence. Fails OPEN (sends anyway) on any error, including "not found" —
 * a missing contact means `resend-add-contact` failed at signup, which is not an opt-out
 * signal and should not silently kill the whole sequence.
 */
async function isUnsubscribed(audienceId: string, email: string, emailHash: string): Promise<boolean> {
  const { data, error } = await resend.contacts.get({ audienceId, email });

  if (error) {
    logger.warn("welcome-sequence: contacts.get failed, sending anyway (fail open)", {
      emailHash,
      error,
    });
    return false;
  }

  return data?.unsubscribed === true;
}

export const welcomeSequence = schemaTask({
  id: "welcome-sequence",
  schema,
  machine: "micro",
  maxDuration: 300,
  queue: { name: "welcome-sequence", concurrencyLimit: 5 },
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
    randomize: true,
  },
  run: async (payload) => {
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const emailHash = hashEmail(payload.email);

    if (!audienceId) {
      logger.warn("welcome-sequence: RESEND_AUDIENCE_ID not set, skipping", { emailHash });
      return { skipped: "no_audience" as const };
    }

    const sent: string[] = [];

    for (const step of STEPS) {
      await wait.for({
        days: step.gapDays,
        idempotencyKey: await idempotencyKeys.create(`welcome-wait-${step.key}`),
        // Default wait-idempotency TTL is only 1h — must be explicit so a retried run
        // long after the wait started still resolves instantly instead of re-waiting.
        idempotencyKeyTTL: "30d",
      });

      if (await isUnsubscribed(audienceId, payload.email, emailHash)) {
        logger.log("welcome-sequence: contact unsubscribed, stopping sequence", {
          emailHash,
          stoppedAt: step.key,
        });
        return { sent, stoppedAt: step.key, reason: "unsubscribed" as const };
      }

      try {
        await retry.onThrow(
          async ({ attempt }) => {
            const unsubscribeUrl = buildUnsubscribeUrl(payload.email);
            const html = await render(
              React.createElement(step.Template, {
                firstName: payload.firstName,
                unsubscribeUrl,
              })
            );

            const { error } = await resend.emails.send({
              from: `Travada Books <${FROM_EMAIL}>`,
              to: [payload.email],
              replyTo: REPLY_TO,
              subject: step.subject,
              html,
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            });

            if (error) {
              logger.warn("welcome-sequence: resend error", {
                emailHash,
                step: step.key,
                attempt,
                error,
              });
              if (isResendClientError(error.name)) {
                throw new AbortTaskRunError(error.message);
              }
              throw new Error(error.message);
            }
          },
          { maxAttempts: 3, minTimeoutInMs: 2000, factor: 2, randomize: true }
        );

        sent.push(step.key);
        logger.log("welcome-sequence: sent", { emailHash, step: step.key });
      } catch (err) {
        // A dead mailbox (or any exhausted-retry send failure) must never restart the
        // whole sequence. Rethrowing here would fail the run, and a task-level retry
        // would re-run `run()` from the top, re-sending every earlier step. Instead we
        // log and continue to the next step, so at most one step is skipped.
        logger.error("welcome-sequence: send failed, continuing sequence", {
          emailHash,
          step: step.key,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { sent };
  },
});
