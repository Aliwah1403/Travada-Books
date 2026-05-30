import { Resend } from "npm:resend@4"

export const resend = new Resend(Deno.env.get("RESEND_API_KEY"))
export const FROM_EMAIL = `noreply@mail.travadasys.com`
