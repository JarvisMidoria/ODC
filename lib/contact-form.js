// Shared, public form rules. The server never trusts a schema supplied by a visitor.
export const CONTACT_FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'number'];
export const MAX_CONTACT_FIELDS = 20;
const ID = /^[a-z][a-z0-9_-]{0,79}$/i;
const OPTION_ID = /^[a-z0-9][a-z0-9_-]{0,79}$/i;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const RESERVED = new Set(['website', 'fields', 'formVersion', '__proto__', 'constructor', 'prototype', 'to', 'from', 'replyTo']);
const choice = (value, label) => ({ _key: value, _type: 'contactFormOption', value, label });
export const DEFAULT_CONTACT_FIELDS = [
  { name: 'name', label: 'Nom', type: 'text', placeholder: 'Votre nom', required: true },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'vous@exemple.com', required: true },
  { name: 'phone', label: 'Téléphone', type: 'tel', placeholder: '+212 5223-69923', required: false },
  { name: 'subject', label: 'Sujet', type: 'select', required: true, defaultValue: 'showroom', options: [
    choice('showroom', 'Visite showroom'), choice('residential', 'Projet résidentiel'), choice('professional', 'Projet professionnel')
  ] },
  { name: 'sector', label: 'Secteur', type: 'select', required: true, placeholder: 'Sélectionner un secteur', when: { field: 'subject', value: 'professional' }, options: [
    choice('hotellerie', 'Hôtellerie'), choice('restauration', 'Restauration'), choice('bureaux', 'Bureaux'),
    choice('medical', 'Médical'), choice('architecture', 'Architecture'), choice('immobilier', 'Immobilier'), choice('autre', 'Autre')
  ] },
  { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Décrivez votre besoin', required: true }
].map(field => ({ _key: field.name, _type: 'contactFormField', ...field }));

function text(value, limit, required = false) {
  if (value != null && typeof value !== 'string') throw new Error('Texte de champ invalide.');
  const result = (value || '').trim();
  if ((required && !result) || result.length > limit || /[\u0000-\u001f\u007f]/.test(result)) throw new Error('Libellé, aide ou choix de formulaire invalide ou trop long.');
  return result;
}

export function normalizeContactFields(raw = DEFAULT_CONTACT_FIELDS) {
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_CONTACT_FIELDS) throw new Error('Le formulaire doit contenir entre 1 et 20 champs.');
  const fields = raw.map(field => {
    if (!field || typeof field !== 'object' || !CONTACT_FIELD_TYPES.includes(field.type)) throw new Error('Type de champ de formulaire invalide.');
    const id = field.name || `field_${field._key || ''}`;
    if (!ID.test(id) || RESERVED.has(id) || (!field.name && !field._key)) throw new Error('Identifiant de champ invalide.');
    if (field.required != null && typeof field.required !== 'boolean') throw new Error('Réglage obligatoire invalide.');
    const options = field.type === 'select' ? (field.options || []).map(option => {
      const value = option?.value || option?._key;
      if (typeof value !== 'string' || !OPTION_ID.test(value) || RESERVED.has(value)) throw new Error('Identifiant de choix invalide.');
      return { value, label: text(option.label, 160, true) };
    }) : [];
    if (field.type === 'select' && (!options.length || options.length > 30 || new Set(options.map(o => o.value)).size !== options.length)) throw new Error('Une liste doit contenir entre 1 et 30 choix distincts.');
    const normalized = { id, label: text(field.label, 160, true), type: field.type, required: field.required === true,
      placeholder: text(field.placeholder, 200), help: text(field.help, 300), options,
      defaultValue: options.some(o => o.value === field.defaultValue) ? field.defaultValue : '' };
    if (field.when?.field && field.when?.value) normalized.when = { field: text(field.when.field, 80, true), value: text(field.when.value, 80, true) };
    return normalized;
  });
  if (new Set(fields.map(f => f.id)).size !== fields.length) throw new Error('Deux champs du formulaire ont le même identifiant.');
  // Removing the original Sujet field makes Secteur an ordinary editable field.
  for (const field of fields) {
    const parent = fields.find(f => f.id === field.when?.field);
    if (field.when && (!parent || !parent.options.some(o => o.value === field.when.value))) delete field.when;
    const seen = new Set([field.id]);
    let next = field;
    while (next.when) {
      if (seen.has(next.when.field)) throw new Error('Condition circulaire dans le formulaire.');
      seen.add(next.when.field);
      next = fields.find(f => f.id === next.when.field);
      if (!next) break;
    }
  }
  return fields;
}

export function contactFieldVisible(field, values, fields) {
  if (!field.when) return true;
  const parent = fields.find(f => f.id === field.when.field);
  return Boolean(parent && contactFieldVisible(parent, values, fields) && values[parent.id] === field.when.value);
}

export function validateContactValues(fields, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Réponses du formulaire invalides.' };
  if (Object.keys(input).some(key => !fields.some(f => f.id === key))) return { error: 'Le formulaire a changé. Actualisez la page avant de réessayer.' };
  const values = Object.create(null);
  for (const field of fields) {
    const value = input[field.id];
    if (field.type === 'checkbox') {
      if (value != null && typeof value !== 'boolean') return { error: `Réponse invalide : ${field.label}.` };
      values[field.id] = value === true;
    } else {
      if (value != null && typeof value !== 'string') return { error: `Réponse invalide : ${field.label}.` };
      values[field.id] = (value || '').trim();
    }
  }
  const answers = [];
  for (const field of fields) {
    if (!contactFieldVisible(field, values, fields)) continue;
    const value = values[field.id];
    if (field.required && !value) return { error: `Merci de compléter le champ « ${field.label} ».` };
    const limit = { text: 500, email: 254, tel: 60, textarea: 8000, select: 80, number: 64 }[field.type];
    if (typeof value === 'string' && (value.length > limit || /\u0000/.test(value) || (field.type !== 'textarea' && /[\r\n]/.test(value)))) return { error: `Réponse invalide ou trop longue : ${field.label}.` };
    if (value && field.type === 'email' && !EMAIL.test(value)) return { error: `Adresse email invalide : ${field.label}.` };
    if (value && field.type === 'number' && !Number.isFinite(Number(value))) return { error: `Nombre invalide : ${field.label}.` };
    const option = field.options.find(o => o.value === value);
    if (value && field.type === 'select' && !option) return { error: `Choix invalide : ${field.label}.` };
    answers.push({ id: field.id, label: field.label, type: field.type, value, display: field.type === 'checkbox' ? (value ? 'Oui' : 'Non') : option?.label || value || 'Non renseigné' });
  }
  if (!answers.some(answer => Boolean(answer.value))) return { error: 'Merci de renseigner au moins une réponse avant l’envoi.' };
  return { answers };
}
