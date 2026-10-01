import { Resend } from "npm:resend@4"

export const resend = new Resend(Deno.env.get("RESEND_API_KEY"))
// Sender address; set the FROM_EMAIL secret once a new Resend domain is verified.
export const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@mail.travadasys.com"
