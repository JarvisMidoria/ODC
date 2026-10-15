import nodemailer from "nodemailer";

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function contactMailConfig() {
  const user = process.env.BREVO_SMTP_USER?.trim();
  const password = process.env.BREVO_SMTP_PASSWORD?.trim();
  const sender = (process.env.MAIL_FROM || "noreply@odyssee.ma").trim();
  const recipient = (process.env.CONTACT_NOTIFICATION_TO || "contact@odyssee.ma").trim();
  if (!user || !password || !EMAIL.test(sender) || !EMAIL.test(recipient) || /[\r\n]/.test(sender + recipient)) return null;
  return { user, password, sender, recipient };
}

export function createContactTransport({ user, password }) {
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com", port: 587, secure: false, requireTLS: true,
    auth: { user, pass: password },
    connectionTimeout: 10_000, greetingTimeout: 8_000, socketTimeout: 12_000,
    disableFileAccess: true, disableUrlAccess: true
  });
}

export function assertAcceptedRecipient(result, recipient) {
  const accepted = (result.accepted || []).some((item) =>
    String(typeof item === "string" ? item : item.address).toLowerCase() === recipient.toLowerCase()
  );
  if (!result.messageId || !accepted) throw Object.assign(new Error("SMTP did not accept recipient"), { code: "SMTP_NOT_ACCEPTED" });
}
