import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import nodemailer from 'nodemailer';
import contact from '../api/contact.js';
import formConfig from '../lib/contact-form-published.json' with { type: 'json' };
import { DEFAULT_CONTACT_FIELDS, normalizeContactFields, validateContactValues } from '../lib/contact-form.js';
import { publishedContactForm } from '../scripts/write-contact-form.mjs';
import { mountContactForm } from '../src/contact-form.js';

const custom = [
  { _key: 'request', type: 'select', label: 'Votre projet', required: true, options: [{ _key: 'design', label: 'Décoration' }, { _key: 'other', label: 'Autre' }] },
  { _key: 'surface', type: 'number', label: 'Surface en m²', required: true },
  { _key: 'details', type: 'textarea', label: 'Précisions', required: false },
  { _key: 'reply', type: 'email', label: 'Votre adresse de réponse', required: false },
  { _key: 'consent', type: 'checkbox', label: 'J’accepte d’être recontacté', required: true }
];
const config = publishedContactForm({ contactFields: custom, contactSubmitLabel: 'Transmettre' });
const valid = { field_request: 'design', field_surface: '25.5', field_details: 'Une pièce <lumineuse>\nÀ Casablanca', field_reply: 'client@example.com', field_consent: true };

test('custom fields enforce types, required rules, choices and original visibility', () => {
  assert.deepEqual(validateContactValues(config.fields, valid).answers.map(a => a.label), custom.map(f => f.label));
  for (const overrides of [{ field_consent: false }, { field_surface: '' }, { field_surface: 'NaN' }, { field_request: 'fake' }, { field_reply: 'bad' }, { field_details: [] }, { field_reply: 'a@b.co\nBcc:x@y.co' }]) {
    assert.ok(validateContactValues(config.fields, { ...valid, ...overrides }).error);
  }
  assert.ok(validateContactValues(config.fields, { ...valid, extra: 'unconfigured' }).error);
  assert.ok(!validateContactValues(config.fields, { ...valid, field_reply: '' }).error);
  const generatedKey = normalizeContactFields([{ _key: '1a2b3c', label: 'Choix', type: 'select', options: [{ _key: '9abcdef01234', label: 'Option créée dans Sanity' }] }]);
  assert.ok(!validateContactValues(generatedKey, { field_1a2b3c: '9abcdef01234' }).error);
  const original = normalizeContactFields();
  assert.ok(!validateContactValues(original, { name: 'A', email: 'a@b.co', subject: 'showroom', message: 'B' }).error);
  assert.ok(validateContactValues(original, { name: 'A', email: 'a@b.co', subject: 'professional', message: 'B' }).error);
  const noSubject = normalizeContactFields(DEFAULT_CONTACT_FIELDS.filter(f => f.name !== 'subject'));
  assert.ok(validateContactValues(noSubject, { name: 'A', email: 'a@b.co', message: 'B' }).error);
  assert.equal(noSubject.find(f => f.id === 'sector').when, undefined);
  for (const input of [[], [...custom, { ...custom[0] }], [{ _key: 'file', label: 'Fichier', type: 'file' }], [{ name: '__proto__', label: 'X', type: 'text' }], [{ _key: 's', label: 'Liste', type: 'select', options: [] }]]) {
    assert.throws(() => normalizeContactFields(input));
  }
  const optional = normalizeContactFields([{ _key: 'q', type: 'text', label: 'Question', required: false }]);
  assert.ok(validateContactValues(optional, {}).error, 'Empty submissions remain invalid even with optional fields');
});

test('API validates against the deployed schema and emails every configured answer, including forms without email', async () => {
  const original = structuredClone(formConfig);
  const env = Object.fromEntries(['BREVO_SMTP_USER','BREVO_SMTP_PASSWORD','MAIL_FROM','CONTACT_NOTIFICATION_TO','CONTACT_VERIFY_ONLY','VERCEL_ENV'].map(key => [key, process.env[key]]));
  const transport = nodemailer.createTransport;
  let sent;
  let sends = 0;
  let requestId = 0;
  const request = async body => {
    const req = { method: 'POST', body, headers: { 'content-type': 'application/json', origin: 'https://www.odyssee.ma' }, socket: { remoteAddress: `dynamic-${requestId++}` } };
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await contact(req, res); return res;
  };
  try {
    Object.assign(formConfig, config);
    Object.assign(process.env, { BREVO_SMTP_USER: 'test', BREVO_SMTP_PASSWORD: 'test', MAIL_FROM: 'noreply@odyssee.ma', CONTACT_NOTIFICATION_TO: 'contact@odyssee.ma', VERCEL_ENV: 'production' });
    delete process.env.CONTACT_VERIFY_ONLY;
    nodemailer.createTransport = () => ({ sendMail: async mail => { sends++; sent = mail; return { messageId: 'mock', accepted: ['contact@odyssee.ma'] }; } });
    assert.equal((await request({ formVersion: config.version, fields: { ...valid, field_surface: '' } })).code, 400);
    assert.equal((await request({ formVersion: 'old', fields: valid })).code, 409);
    assert.equal(sends, 0);
    const response = await request({ formVersion: config.version, fields: valid, to: 'attacker@example.com', labels: ['Forged label'] });
    assert.equal(response.code, 201);
    assert.deepEqual(sent.to, [{ address: 'contact@odyssee.ma' }]);
    assert.equal(sent.replyTo.address, 'client@example.com');
    assert.ok(sent.text.includes('Votre projet : Décoration'));
    assert.ok(sent.text.includes('Surface en m² : 25.5'));
    assert.ok(sent.text.includes('J’accepte d’être recontacté : Oui'));
    assert.ok(sent.html.includes('&lt;lumineuse&gt;'));
    assert.ok(!sent.text.includes('Forged label'));
    formConfig.fields = config.fields.filter(f => f.type !== 'email' && f.type !== 'number');
    const { field_reply, field_surface, ...removed } = valid;
    assert.equal((await request({ formVersion: config.version, fields: removed })).code, 201);
    assert.equal(sent.replyTo, undefined);
    assert.ok(!sent.text.includes('Surface en m²'));
    assert.equal((await request({ formVersion: config.version, fields: valid })).code, 400, 'Removed fields cannot be silently lost');
  } finally {
    Object.assign(formConfig, original);
    nodemailer.createTransport = transport;
    for (const [key, value] of Object.entries(env)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test('browser honors required custom fields, preserves failed messages, resets only on success and disables preview sends', async () => {
  const dom = new JSDOM('<form></form>', { url: 'https://www.odyssee.ma/' });
  const form = dom.window.document.querySelector('form');
  const previousFetch = globalThis.fetch;
  let calls = 0;
  let status = 502;
  let payload;
  globalThis.fetch = async (url, options) => { calls++; payload = JSON.parse(options.body); return { ok: status === 201, json: async () => status === 201 ? { success: true, message: 'Envoyé' } : { error: 'Échec de test : saisie conservée' } }; };
  try {
    mountContactForm(form, config);
    form.requestSubmit();
    assert.equal(calls, 0, 'Native required rules prevent an incomplete request');
    form.elements.namedItem('field_request').value = 'design';
    form.elements.namedItem('field_surface').value = '25.5';
    form.elements.namedItem('field_details').value = 'Message à conserver';
    form.elements.namedItem('field_consent').checked = true;
    assert.ok(form.checkValidity());
    form.requestSubmit();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    assert.equal(payload.formVersion, config.version);
    assert.equal(payload.fields.field_consent, true);
    assert.equal(payload.fields.field_surface, '25.5');
    assert.equal(form.elements.namedItem('field_details').value, 'Message à conserver');
    assert.ok(form.textContent.includes('saisie conservée'));
    status = 201; form.requestSubmit();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(form.elements.namedItem('field_details').value, '');
    assert.ok(form.textContent.includes('Envoyé'));
    const preview = dom.window.document.createElement('form');
    dom.window.document.body.append(preview);
    mountContactForm(preview, { ...config, fields: config.fields.map(f => ({ ...f, required: false })) }, { preview: true });
    preview.requestSubmit();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 2);
    assert.ok(preview.textContent.includes('aucun message'));
    const conditional = dom.window.document.createElement('form');
    dom.window.document.body.append(conditional);
    mountContactForm(conditional, publishedContactForm({}));
    const sector = conditional.elements.namedItem('sector');
    assert.equal(sector.disabled, true);
    conditional.elements.namedItem('subject').value = 'professional';
    conditional.elements.namedItem('subject').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(sector.required, true);
    assert.equal(sector.disabled, false);
  } finally { globalThis.fetch = previousFetch; dom.window.close(); }
});
