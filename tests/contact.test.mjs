import assert from "node:assert/strict";
import { test } from "node:test";
import contact from "../api/contact.js";
import nodemailer from "nodemailer";

let index = 0;
const valid = { name: "Visiteur <test>", email: "visitor@example.com", subject: "showroom", message: "Bonjour\nUn rendez-vous ?" };
async function request({ method = "POST", body = valid, origin = "https://www.odyssee.ma", headers = {}, ip } = {}) {
  const req = {
    method, body, headers: { "content-type": "application/json", origin, ...headers },
    socket: { remoteAddress: ip || `test-${index++}` }
  };
  const res = {
    headers: {}, statusCode: 200,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
  await contact(req, res);
  return res;
}

test("contact validation and delivery failures cannot report success", async () => {
  const oldCreateTransport = nodemailer.createTransport;
  const oldUser = process.env.BREVO_SMTP_USER;
  const oldPassword = process.env.BREVO_SMTP_PASSWORD;
  const oldVerify = process.env.CONTACT_VERIFY_ONLY;
  const oldEnv = process.env.VERCEL_ENV;
  const oldSender = process.env.MAIL_FROM;
  const oldRecipient = process.env.CONTACT_NOTIFICATION_TO;
  let sends = 0;
  try {
    delete process.env.BREVO_SMTP_USER;
    delete process.env.BREVO_SMTP_PASSWORD;
    delete process.env.CONTACT_VERIFY_ONLY;
    nodemailer.createTransport = () => { sends++; throw new Error("Unexpected email"); };
    assert.equal((await request({ method: "GET" })).statusCode, 405);
    assert.equal((await request({ origin: "https://untrusted.example" })).statusCode, 403);
    assert.equal((await request({ headers: { "content-type": "text/plain" } })).statusCode, 415);
    for (const body of [null, [], "{", { ...valid, email: "bad" }, { ...valid, name: "" }, { ...valid, subject: "toString" },
      { ...valid, subject: "professional", sector: "" }, { ...valid, message: [] }, { ...valid, website: "spam" },
      { ...valid, email: "user@example.com\nBcc:evil@example.com" }]) {
      assert.equal((await request({ body })).statusCode, 400);
    }
    assert.equal((await request({ body: { ...valid, message: "a".repeat(30_000) } })).statusCode, 413);
    assert.equal((await request()).statusCode, 503);
    assert.equal(sends, 0);
    process.env.BREVO_SMTP_USER = "smtp-user";
    process.env.BREVO_SMTP_PASSWORD = "unit-test-key";
    process.env.MAIL_FROM = "noreply@odyssee.ma";
    process.env.CONTACT_NOTIFICATION_TO = "contact@odyssee.ma";
    let sent;
    nodemailer.createTransport = (options) => {
      assert.equal(options.host, "smtp-relay.brevo.com");
      assert.equal(options.requireTLS, true);
      return { sendMail: async (mail) => {
        sends++;
        sent = mail;
        return { messageId: "test-id", accepted: ["contact@odyssee.ma"] };
      } };
    };
    const ok = await request({ body: { ...valid, to: [{ email: "evil@example.com" }] } });
    assert.equal(ok.statusCode, 201);
    assert.equal(ok.payload.success, true);
    assert.deepEqual(sent.to, [{ address: "contact@odyssee.ma" }]);
    assert.equal(sent.replyTo.address, valid.email);
    assert.ok(sent.html.includes("&lt;test&gt;"));
    assert.ok(!sent.html.includes("Visiteur <test>"));
    nodemailer.createTransport = () => ({ sendMail: async () => { throw Object.assign(new Error("refused"), { code: "EAUTH" }); } });
    const failed = await request();
    assert.equal(failed.statusCode, 502);
    assert.equal(failed.payload.success, undefined);
    nodemailer.createTransport = () => ({ sendMail: async () => ({ messageId: "id", accepted: [] }) });
    assert.equal((await request()).statusCode, 502);
    let verifies = 0;
    nodemailer.createTransport = () => ({ verify: async () => { verifies++; return true; }, sendMail: async () => { throw new Error("Must never send in preview verification"); } });
    process.env.CONTACT_VERIFY_ONLY = "1";
    process.env.VERCEL_ENV = "preview";
    assert.equal((await request()).statusCode, 200);
    assert.equal(verifies, 1);
    process.env.VERCEL_ENV = "production";
    assert.equal((await request()).statusCode, 503);
    assert.equal(verifies, 1);
    delete process.env.CONTACT_VERIFY_ONLY;
    nodemailer.createTransport = () => ({ sendMail: async () => ({ messageId: "id", accepted: ["contact@odyssee.ma"] }) });
    for (let n = 0; n < 5; n++) assert.equal((await request({ ip: "repeat" })).statusCode, 201);
    assert.equal((await request({ ip: "repeat" })).statusCode, 429);
  } finally {
    nodemailer.createTransport = oldCreateTransport;
    for (const [key, value] of Object.entries({ BREVO_SMTP_USER: oldUser, BREVO_SMTP_PASSWORD: oldPassword, CONTACT_VERIFY_ONLY: oldVerify, VERCEL_ENV: oldEnv, MAIL_FROM: oldSender, CONTACT_NOTIFICATION_TO: oldRecipient })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
