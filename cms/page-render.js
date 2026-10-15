import { escapeHtml, safeUrl, richHtml, imageUrl, fileUrl } from './content-model.js';

export const selectorAllowed = selector => /^\[data-odc-cms="[a-z0-9-]+"\]$/.test(selector || '');
export const inlineRichHtml = value => richHtml(value).replace(/^<p>/, '').replace(/<\/p>$/, '').replace(/<\/p>\s*<p>/g, '<br><br>');
export function galleryHtml(page, assets) {
  return (page.gallery || []).map((media, index) => `<article class="odc-ambiances-slide${index % 3 === 2 ? ' odc-ambiances-slide--wide' : ''}"><img src="${escapeHtml(imageUrl(media, assets))}" alt="${escapeHtml(media.alt)}" loading="${index ? 'lazy' : 'eager'}" /></article>`).join('');
}
export function sectionsHtml(page, assets) {
  return (page.sections || []).map((section, index) => `<article class="odc-contract-story__row${index % 2 ? ' odc-contract-story__row--reverse' : ''}"><div class="odc-contract-story__copy"><p class="odc-contract-kicker">${escapeHtml(section.eyebrow)}</p><h2 class="odc-contract-section__title">${escapeHtml(section.title)}</h2><div class="odc-contract-story__text">${richHtml(section.body)}</div></div><div class="odc-contract-story__media"><img src="${escapeHtml(imageUrl(section.image, assets))}" alt="${escapeHtml(section.image?.alt)}" loading="lazy" /></div></article>`).join('');
}
export function clientGroupsHtml(page, assets) {
  return (page.clientGroups || []).map(group => `<section class="odc-contract-clients__group"><div class="odc-contract-clients__group-head"><p class="odc-contract-kicker">${escapeHtml(group.eyebrow)}</p><h2 class="odc-contract-clients__group-title">${escapeHtml(group.title)}</h2></div><div class="odc-contract-clients__grid">${(group.logos || []).map(logo => `<article class="odc-contract-clients__logo-card"><img src="${escapeHtml(imageUrl(logo, assets))}" alt="${escapeHtml(logo.alt)}" loading="lazy"></article>`).join('')}</div></section>`).join('');
}
export function applyPageToDom(page, assets, doc = document) {
  for (const field of page?.texts || []) {
    if (!selectorAllowed(field.selector)) continue;
    doc.querySelectorAll(field.selector).forEach(node => { node.innerHTML = inlineRichHtml(field.value); });
  }
  for (const field of page?.media || []) {
    if (!selectorAllowed(field.selector)) continue;
    doc.querySelectorAll(field.selector).forEach(node => {
      const url = field.kind === 'file' ? fileUrl(field.file, assets) : imageUrl(field.image, assets);
      if (!url) return;
      if (node.tagName === 'SOURCE') {
        if (node.src !== new URL(url, doc.baseURI).href) { node.src = url; node.setAttribute('data-src', url); node.parentElement?.load?.(); }
      } else { node.src = url; node.setAttribute('srcset', url); node.alt = field.image?.alt || ''; }
    });
  }
  for (const field of page?.links || []) if (selectorAllowed(field.selector)) doc.querySelectorAll(field.selector).forEach(node => node.setAttribute('href', safeUrl(field.href, '#')));
  if (Array.isArray(page?.gallery) && (page.gallery.length || page.template !== 'press-book')) {
    const track = doc.querySelector('.odc-ambiances-carousel__track'); if (track) track.innerHTML = galleryHtml(page, assets);
  }
  if (Array.isArray(page?.sections)) {
    const target = doc.querySelector('.odc-contract-story, [data-cms-sections]'); if (target) target.innerHTML = sectionsHtml(page, assets);
  }
  if (Array.isArray(page?.clientGroups)) { const target = doc.querySelector('.odc-contract-clients__sections'); if (target) target.innerHTML = clientGroupsHtml(page, assets); }
}
