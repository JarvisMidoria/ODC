import { contactFieldVisible } from '../lib/contact-form.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderContactForm(config) {
  return `<label class="odc-contact-honeypot" aria-hidden="true">Site web<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
    ${config.fields.map(field => {
      const id = `odc-contact-${field.id}`;
      const attributes = `id="${id}" name="${escape(field.id)}" ${field.required ? 'required' : ''} ${field.help ? `aria-describedby="${id}-help"` : ''}`;
      const label = `${escape(field.label)}${field.required ? '<span aria-hidden="true"> *</span>' : ''}`;
      const help = field.help ? `<small id="${id}-help" class="odc-contact-field-help">${escape(field.help)}</small>` : '';
      let input;
      if (field.type === 'textarea') input = `<textarea ${attributes} rows="5" maxlength="8000" placeholder="${escape(field.placeholder)}"></textarea>`;
      else if (field.type === 'select') input = `<select ${attributes}><option value="">${escape(field.placeholder || 'Sélectionner une réponse')}</option>${field.options.map(o => `<option value="${escape(o.value)}" ${field.defaultValue === o.value ? 'selected' : ''}>${escape(o.label)}</option>`).join('')}</select>`;
      else input = `<input ${attributes} type="${field.type}" ${field.type === 'number' ? 'step="any"' : ''} ${['text','email','tel'].includes(field.type) ? `maxlength="${{text:500,email:254,tel:60}[field.type]}"` : ''} placeholder="${escape(field.placeholder)}">`;
      return `<div class="odc-contact-field${field.type === 'checkbox' ? ' odc-contact-field--checkbox' : ''}" data-contact-field="${escape(field.id)}">${field.type === 'checkbox' ? `<label for="${id}">${input}<span>${label}</span></label>` : `<label for="${id}"><span>${label}</span>${input}</label>`}${help}</div>`;
    }).join('')}
    <button class="odc-contract-form__submit" type="submit">${escape(config.submitLabel)}</button>
    <p id="odc-contract-contact-feedback" class="odc-contract-form__feedback" aria-live="polite"></p>`;
}

export function mountContactForm(form, config, { preview = false } = {}) {
  if (!form || form.dataset.odcDynamicContactReady === config.version) return;
  form.dataset.odcDynamicContactReady = config.version;
  form.innerHTML = renderContactForm(config);
  const readValues = () => Object.fromEntries(config.fields.map(field => {
    const element = form.elements.namedItem(field.id);
    return [field.id, field.type === 'checkbox' ? element.checked : element.value.trim()];
  }));
  const sync = () => {
    const values = readValues();
    for (const field of config.fields) {
      const visible = contactFieldVisible(field, values, config.fields);
      const element = form.elements.namedItem(field.id);
      element.closest('[data-contact-field]').hidden = !visible;
      element.disabled = !visible;
      element.required = visible && field.required;
      if (!visible) { if (field.type === 'checkbox') element.checked = false; else element.value = ''; }
    }
  };
  form.addEventListener('change', sync);
  sync();
  const feedback = form.querySelector('[aria-live]');
  if (preview) feedback.textContent = 'Prévisualisation : aucun message ne sera envoyé.';
  let sending = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (preview || sending) return;
    const button = form.querySelector('[type="submit"]');
    const all = readValues();
    const fields = Object.fromEntries(config.fields.filter(field => contactFieldVisible(field, all, config.fields)).map(field => [field.id, all[field.id]]));
    const payload = { formVersion: config.version, fields, website: form.elements.namedItem('website').value };
    sending = true; button.disabled = true; feedback.textContent = 'Envoi en cours…';
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success !== true) throw new Error(result.error || 'Impossible d’envoyer votre message.');
      form.reset(); sync(); feedback.textContent = result.message || 'Merci. Votre message a bien été envoyé.';
    } catch (error) {
      feedback.textContent = error.message || 'Impossible d’envoyer votre message.';
    } finally { sending = false; button.disabled = false; }
  });
}
