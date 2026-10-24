import { createHash } from 'node:crypto';
import { normalizeContactFields } from '../lib/contact-form.js';

export function publishedContactForm(settings) {
  const fields = normalizeContactFields(settings.contactFields);
  const submitLabel = String(settings.contactSubmitLabel || 'Envoyer').trim();
  if (!submitLabel || submitLabel.length > 80 || /[\u0000-\u001f]/.test(submitLabel)) throw new Error('Libellé du bouton de formulaire invalide.');
  return { version: `v1-${createHash('sha256').update(JSON.stringify(fields)).digest('hex').slice(0, 24)}`, fields, submitLabel };
}
