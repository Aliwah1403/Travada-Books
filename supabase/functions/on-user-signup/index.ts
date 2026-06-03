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

  // Add to Resend contacts (non-blocking)
  const RESEND_SEGMENT_ID = Deno.env.get("RESEND_SEGMENT_ID") ?? "";
  try {
    await resend.contacts.create({
      email: record.email,
      firstName: firstName || undefined,
      lastName,
      unsubscribed: false,
      segmentIds: RESEND_SEGMENT_ID ? [RESEND_SEGMENT_ID] : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Resend contacts error (non-fatal):", message);
  }

  try {
    await resend.emails.send({
      from: `Travada Books <${FROM_EMAIL}>`,
      to: record.email,
      replyTo: ["curtis.aliwah@travadasys.com", "nate.muliro@travadasys.com"],
      subject: "Welcome to Travada Books",
      html: await render(WelcomeEmail({ firstName: firstName || undefined })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Resend email error:", message);
    return new Response("Failed to send welcome email", { status: 502 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
