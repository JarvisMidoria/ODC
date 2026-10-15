import assert from "node:assert/strict";
import { test } from "node:test";
import nodemailer from "nodemailer";
import monthlyTest from "../api/contact-monthly-test.js";

test("monthly test authenticates, fails closed outside production, and requires SMTP acceptance", async () => {
  const keys = ["CRON_SECRET", "VERCEL_ENV", "CONTACT_VERIFY_ONLY", "BREVO_SMTP_USER", "BREVO_SMTP_PASSWORD", "MAIL_FROM", "CONTACT_NOTIFICATION_TO"];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const createTransport = nodemailer.createTransport;
  const log = console.info;
  let sends = 0;
  async function request({ method = "GET", authorization = "Bearer test-secret", query = {} } = {}) {
    const res = {
      headers: {}, setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.code = code; return this; },
      json(body) { this.body = body; return this; }
    };
    await monthlyTest({ method, headers: { authorization }, query }, res);
    assert.equal(res.headers["Cache-Control"], "no-store");
    return res;
  }
  try {
    Object.assign(process.env, { CRON_SECRET: "test-secret", VERCEL_ENV: "production", BREVO_SMTP_USER: "user", BREVO_SMTP_PASSWORD: "password", MAIL_FROM: "noreply@odyssee.ma", CONTACT_NOTIFICATION_TO: "contact@odyssee.ma" });
    delete process.env.CONTACT_VERIFY_ONLY;
    let mail;
    nodemailer.createTransport = options => {
      assert.equal(options.requireTLS, true);
      return { sendMail: async value => {
        sends++; mail = value;
        return { messageId: "test", accepted: ["contact@odyssee.ma"] };
      } };
    };
    assert.equal((await request({ method: "POST" })).code, 405);
    for (const authorization of ["", "Bearer wrong", "Bearer test-secret-extra"]) {
      assert.equal((await request({ authorization })).code, 401);
    }
    delete process.env.CRON_SECRET;
    assert.equal((await request({ authorization: "Bearer " })).code, 401);
    process.env.CRON_SECRET = "test-secret";
    process.env.VERCEL_ENV = "preview";
    assert.equal((await request()).code, 503);
    process.env.VERCEL_ENV = "production";
    process.env.CONTACT_VERIFY_ONLY = "1";
    assert.equal((await request()).code, 503);
    delete process.env.CONTACT_VERIFY_ONLY;
    delete process.env.BREVO_SMTP_PASSWORD;
    assert.equal((await request()).code, 503);
    process.env.BREVO_SMTP_PASSWORD = "password";
    assert.equal(sends, 0);
    let successLog;
    console.info = (...args) => { successLog = args; };
    const ok = await request({ query: { to: "other@example.com" } });
    assert.equal(ok.code, 200);
    assert.equal(ok.body.status, "smtp_accepted");
    assert.deepEqual(mail.to, [{ address: "contact@odyssee.ma" }]);
    assert.equal(mail.subject, "[Odyssée] Test automatique mensuel du formulaire");
    assert.equal(successLog[0], "CONTACT_MONTHLY_TEST_ACCEPTED");
    for (const result of [{ messageId: "id", accepted: [] }, { accepted: ["contact@odyssee.ma"] }]) {
      nodemailer.createTransport = () => ({ sendMail: async () => result });
      const failed = await request();
      assert.equal(failed.code, 502);
      assert.equal(failed.body.success, false);
    }
    nodemailer.createTransport = () => ({ sendMail: async () => { throw new Error("secret-bearing upstream diagnostic"); } });
    const failed = await request();
    assert.equal(failed.code, 502);
    assert.equal(JSON.stringify(failed.body).includes("secret-bearing"), false);
  } finally {
    console.info = log;
    nodemailer.createTransport = createTransport;
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
