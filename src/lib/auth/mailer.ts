import "server-only";

/**
 * Sends a transactional email through Resend (https://resend.com) when
 * RESEND_API_KEY and EMAIL_FROM are set. Without them, in development the
 * message is printed to the server console so the flow can be tested locally.
 * Returns false when nothing could be delivered.
 */
export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[maptrip] E-mail (sem provedor configurado) para ${to}\nAssunto: ${subject}\n${text}\n`);
      return true;
    }
    console.error("[maptrip] RESEND_API_KEY/EMAIL_FROM ausentes: e-mail não enviado.");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
    if (!res.ok) console.error(`[maptrip] Resend respondeu ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error("[maptrip] Falha ao enviar e-mail", err);
    return false;
  }
}

/** Public base URL used in links (emails, OAuth redirect). */
export function appUrl(fallbackOrigin: string): string {
  return (process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin).replace(/\/+$/, "");
}
