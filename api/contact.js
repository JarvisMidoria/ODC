import { createHash } from "node:crypto";
import nodemailer from "nodemailer";

const MAX_BODY_BYTES = 24 * 1024;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const SUBJECTS = {
  showroom: "Visite showroom",
  residential: "Projet résidentiel",
  professional: "Projet professionnel",
  contract: "Projet contract"
};
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;

function reply(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function allowedOrigin(origin) {
  if (!origin) return true; // Non-browser clients have no Origin header.
  if (process.env.NODE_ENV === "development" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  const origins = new Set(["https://www.odyssee.ma", "https://odyssee.ma"]);
  if (process.env.VERCEL_URL) origins.add(`https://${process.env.VERCEL_URL}`);
  if (process.env.CONTACT_SITE_ORIGIN) origins.add(process.env.CONTACT_SITE_ORIGIN);
  return origins.has(origin);
}

function rateLimited(req) {
  // Best effort per instance; the platform firewall is the global protection.
  const ip = String(req.headers["x-vercel-forwarded-for"] || req.socket?.remoteAddress || "unknown");
  const key = createHash("sha256").update(ip).digest("hex");
  const now = Date.now();
  for (const [id, entry] of attempts) {
    if (now - entry.start >= WINDOW_MS) attempts.delete(id);
  }
  const entry = attempts.get(key) || { start: now, count: 0 };
  entry.count += 1;
  if (attempts.size < 2000 || attempts.has(key)) attempts.set(key, entry);
  return entry.count > 5;
}

export default async function contact(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(res, 405, { error: "Méthode non autorisée." });
  }
  if (!allowedOrigin(req.headers.origin) || req.headers["sec-fetch-site"] === "cross-site") {
    return reply(res, 403, { error: "Origine non autorisée." });
  }
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    return reply(res, 415, { error: "Format de message invalide." });
  }

  let payload;
  try {
    if (Number(req.headers["content-length"]) > MAX_BODY_BYTES) {
      return reply(res, 413, { error: "Message trop volumineux." });
    }
    if (req.body !== undefined) {
      const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return reply(res, 413, { error: "Message trop volumineux." });
      payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } else {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += Buffer.byteLength(chunk);
        if (size > MAX_BODY_BYTES) return reply(res, 413, { error: "Message trop volumineux." });
        chunks.push(Buffer.from(chunk));
      }
      payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    }
  } catch {
    return reply(res, 400, { error: "Message invalide." });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reply(res, 400, { error: "Message invalide." });
  }
  if (payload.website) return reply(res, 400, { error: "Message invalide." });

  const values = {};
  for (const [field, limit] of Object.entries({ name: 150, email: 254, phone: 60, subject: 40, sector: 100, message: 8000 })) {
    if (payload[field] !== undefined && typeof payload[field] !== "string") {
      return reply(res, 400, { error: "Champs invalides." });
    }
    values[field] = (payload[field] || "").trim();
    if (values[field].length > limit || (field !== "message" && /[\r\n]/.test(values[field]))) {
      return reply(res, 400, { error: "Champs invalides ou trop longs." });
    }
  }
  if (!values.name || !EMAIL.test(values.email) || !Object.hasOwn(SUBJECTS, values.subject) || !values.message ||
      (values.subject === "professional" && !values.sector)) {
    return reply(res, 400, { error: "Merci de compléter les champs requis avec une adresse email valide." });
  }
  const smtpUser = process.env.BREVO_SMTP_USER?.trim();
  const smtpPassword = process.env.BREVO_SMTP_PASSWORD?.trim();
  const verifyOnly = process.env.CONTACT_VERIFY_ONLY === "1";
  const sender = (process.env.MAIL_FROM || "noreply@odyssee.ma").trim();
  const recipient = (process.env.CONTACT_NOTIFICATION_TO || "contact@odyssee.ma").trim();
  if (!smtpUser || !smtpPassword || !EMAIL.test(sender) || !EMAIL.test(recipient) || (verifyOnly && process.env.VERCEL_ENV === "production")) {
    return reply(res, 503, { error: "Le formulaire est temporairement indisponible. Écrivez à contact@odyssee.ma." });
  }
  if (rateLimited(req)) {
    res.setHeader("Retry-After", "900");
    return reply(res, 429, { error: "Trop de messages envoyés. Réessayez plus tard ou écrivez à contact@odyssee.ma." });
  }

  const textContent = [
    "Nouveau message depuis le site Odyssée", "",
    `Sujet : ${SUBJECTS[values.subject]}`, `Nom : ${values.name}`, `Email : ${values.email}`,
    `Téléphone : ${values.phone || "Non renseigné"}`, `Secteur : ${values.sector || "—"}`,
    "", values.message
  ].join("\n");
  try {
    const transport = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: smtpUser, pass: smtpPassword },
      connectionTimeout: 10_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
      disableFileAccess: true,
      disableUrlAccess: true
    });
    if (verifyOnly) {
      // Preview verification authenticates to SMTP but never submits an email.
      await transport.verify();
      return reply(res, 200, { success: true, message: "Connexion d’envoi validée en préversion : aucun email envoyé." });
    }
    const result = await transport.sendMail({
      from: { name: "Odyssée", address: sender },
      to: [{ address: recipient }],
      replyTo: { address: values.email, name: values.name },
      subject: `[Odyssée] ${SUBJECTS[values.subject]}`,
      text: textContent,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${escapeHtml(textContent).replace(/\n/g, "<br>")}</div>`
    });
    const accepted = (result.accepted || []).some((item) =>
      String(typeof item === "string" ? item : item.address).toLowerCase() === recipient.toLowerCase()
    );
    if (!result.messageId || !accepted) throw new Error("SMTP did not accept recipient");
    return reply(res, 201, { success: true, message: "Merci. Votre message a bien été envoyé à notre équipe." });
  } catch (error) {
    // Never log the SMTP credentials or the visitor's message.
    console.error("Contact SMTP failed", error.code || "SMTP_ERROR");
    return reply(res, 502, { error: "L’envoi n’a pas pu être confirmé. Réessayez ou écrivez à contact@odyssee.ma." });
  }
}
