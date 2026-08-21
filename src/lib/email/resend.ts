import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

// onboarding@resend.dev works with zero setup but only delivers to the
// account's own verified address — fine for getting the pipeline right
// before a real domain is verified.
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS ?? "Pitstop <onboarding@resend.dev>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let resend: Resend;
  try {
    resend = getClient();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
