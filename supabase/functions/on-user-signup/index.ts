import { render } from "npm:@react-email/render@1";
import { resend, FROM_EMAIL } from "../_shared/resend.ts";
import { WelcomeEmail } from "../_shared/emails/welcome.tsx";

Deno.serve(async (req) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const record = (
    body as { record?: { id?: string; email?: string; full_name?: string } }
  ).record;

  if (!record?.email) {
    return new Response("Missing email", { status: 400 });
  }

  const [firstName, ...rest] = (record.full_name ?? "").split(" ");
  const lastName = rest.join(" ") || undefined;

  const TRIGGER_SECRET_KEY = Deno.env.get("TRIGGER_SECRET_KEY");

  const triggerPromise = TRIGGER_SECRET_KEY
    ? fetch("https://api.trigger.dev/api/v1/tasks/resend-add-contact/trigger", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TRIGGER_SECRET_KEY}`,
          "Content-Type": "application/json",
          "x-trigger-api-version": "2023-11-14",
        },
        body: JSON.stringify({ payload: { email: record.email, firstName: firstName || undefined, lastName } }),
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Trigger.dev resend-add-contact failed: ${res.status} ${res.statusText} - ${text}`);
        }
      }).catch((err) => console.error("Trigger.dev resend-add-contact failed (non-fatal):", err))
    : Promise.resolve();

  const emailHtml = await render(WelcomeEmail({ firstName: firstName || undefined }));

  const [, emailResult] = await Promise.allSettled([
    triggerPromise,
    resend.emails.send({
      from: `Travada Books <${FROM_EMAIL}>`,
      to: record.email,
      replyTo: ["curtis.aliwah@travadasys.com", "nate.muliro@travadasys.com"],
      subject: "Welcome to Travada Books",
      html: emailHtml,
    }),
  ]);

  if (emailResult.status === "rejected") {
    const message = emailResult.reason instanceof Error ? emailResult.reason.message : String(emailResult.reason);
    console.error("Resend email error:", message);
    return new Response("Failed to send welcome email", { status: 502 });
  }
  if (emailResult.status === "fulfilled" && emailResult.value.error) {
    console.error("Resend email error:", emailResult.value.error);
    return new Response("Failed to send welcome email", { status: 502 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
