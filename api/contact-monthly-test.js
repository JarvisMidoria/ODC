import { timingSafeEqual } from "node:crypto";
import { contactMailConfig, createContactTransport, assertAcceptedRecipient } from "../lib/contact-mail.js";

function reply(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

export default async function monthlyTest(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reply(res, 405, { success: false });
  }
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(String(req.headers.authorization || ""));
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return reply(res, 401, { success: false });
  }
  // Preview deployments must never send the scheduled production test.
  const config = contactMailConfig();
  if (process.env.VERCEL_ENV !== "production" || process.env.CONTACT_VERIFY_ONLY === "1" || !config) {
    console.error("CONTACT_MONTHLY_TEST_FAILED", "CONFIGURATION");
    return reply(res, 503, { success: false, code: "CONFIGURATION" });
  }
  const checkedAt = new Date().toISOString();
  try {
    const transport = createContactTransport(config);
    const result = await transport.sendMail({
      from: { name: "Odyssée", address: config.sender },
      to: [{ address: config.recipient }],
      subject: "[Odyssée] Test automatique mensuel du formulaire",
      text: [
        "Ceci est un test automatique du service d’envoi du formulaire Odyssée.",
        "Il utilise la même clé SMTP Brevo que les messages des visiteurs et maintient son activité.",
        "Ce message ne correspond pas à une demande client. Aucune réponse n’est nécessaire.",
        "", `Date du test (UTC) : ${checkedAt}`,
        "L’acceptation SMTP confirme l’envoi au relais ; elle ne garantit pas le classement dans votre boîte de réception."
      ].join("\n")
    });
    assertAcceptedRecipient(result, config.recipient);
    console.info("CONTACT_MONTHLY_TEST_ACCEPTED", JSON.stringify({ checkedAt }));
    return reply(res, 200, { success: true, checkedAt, status: "smtp_accepted" });
  } catch {
    // Fixed diagnostic only: no secrets, SMTP responses, or recipient data.
    console.error("CONTACT_MONTHLY_TEST_FAILED", "SMTP_SEND");
    return reply(res, 502, { success: false, checkedAt, code: "SMTP_SEND" });
  }
}
