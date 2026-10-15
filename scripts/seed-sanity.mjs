import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { JSDOM } from 'jsdom';
import { Schema } from '@sanity/schema';
import { htmlToBlocks } from '@portabletext/block-tools';
import { createClient } from '@sanity/client';
import { schemaTypes } from '../cms/schema.js';
import { pageDefinitions } from '../cms/pages.js';
import { odysseeImportedProducts } from '../src/product-catalog-odyssee-imported.js';
import { DEFAULT_SITE_CONTENT } from '../src/site-content.js';

const client = createClient({ projectId: process.env.SANITY_API_PROJECT_ID, dataset: process.env.SANITY_API_DATASET, token: process.env.SANITY_API_WRITE_TOKEN, apiVersion: '2025-02-19', useCdn: false });
if (!client.config().token || client.config().projectId !== 've9xrq77') throw new Error('Expected the provisioned Odyssée CMS credentials');
const existing = await client.fetch('*');
await fs.mkdir('data/archives/sanity-before-import', { recursive: true, mode: 0o700 });
const backupPath = `data/archives/sanity-before-import/${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await fs.writeFile(backupPath, JSON.stringify(existing), { mode: 0o600 });
const layout = JSON.parse(await fs.readFile('cms/legacy-layout.json', 'utf8'));
const blockType = Schema.compile({ name: 'seed', types: schemaTypes }).get('richText');
const rich = html => htmlToBlocks(html || '', blockType, { parseHtml: html => new JSDOM(html).window.document });
const key = value => createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
const image = (url, alt = '') => ({ _type: 'managedImage', url, alt });
const docs = [];
const settings = {
  _id: 'odc.settings', _type: 'siteSettings', title: 'Odyssée',
  logo: image('/custom-assets/logo-odv-black.png', 'Logo Odyssée'), footerLogo: image('/custom-assets/logo-odc-white.png', 'Logo Odyssée'), contractLogo: image('/custom-assets/odyssee-contract-black.png', 'Odyssée Contract'),
  navigation: layout.navItems.map(n => ({ _type: 'navigationLink', _key: key(n.href), href: n.href, label: n.label })),
  contractNavigation: layout.contractAreaNavItems.map(n => ({ _type: 'navigationLink', _key: key(n.href), href: n.href, label: n.label })),
  contactCta: 'Prendre contact', email: 'contact@odyssee.ma', phone: '+212 5223-69923',
  contactTitle: 'Parlons de votre projet.', contactIntro: 'Échangez avec notre équipe pour une visite showroom, un projet résidentiel ou une demande professionnelle.',
  showrooms: layout.showroomAccordionItems.map(s => ({ _type: 'showroom', _key: key(s.city), ...s })),
  socialLinks: [{ _type: 'navigationLink', _key: 'facebook', label: 'Facebook', href: 'https://m.facebook.com/www.odyssee.ma/' }, { _type: 'navigationLink', _key: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/odyssee_tissus_maroc?igsh=MTF3NjkxeWg5bDNyOQ==' }, { _type: 'navigationLink', _key: 'x', label: 'X', href: '#' }, { _type: 'navigationLink', _key: 'linkedin', label: 'LinkedIn', href: '#' }]
};
docs.push(settings);
const brands = new Map();
for (const [i, b] of layout.partnerLogos.entries()) {
  const id = `odc.brand.${key(b.alt)}`; brands.set(b.alt, id);
  docs.push({ _id: id, _type: 'brand', title: b.alt, href: b.href, logo: image(b.src, b.alt), visible: true, order: i, layout: Object.fromEntries(['width', 'height', 'basis', 'scale', 'gridWidth', 'gridHeight'].map(k => [k, b[k]])) });
}
for (const p of odysseeImportedProducts) if (!brands.has(p.brand)) {
  const id = `odc.brand.${key(p.brand)}`; brands.set(p.brand, id); docs.push({ _id: id, _type: 'brand', title: p.brand, visible: false, order: 100 });
}
docs.push(...[{ key: 'all', title: 'Produits', typeLabel: 'Tous les produits' }, { key: 'tissu', title: 'Tissus', typeLabel: 'Tissu' }, { key: 'papier-peint', title: 'Papiers peints', typeLabel: 'Papier peint' }].map((c, i) => ({ _id: `odc.collection.${c.key}`, _type: 'collection', order: i, ...c })));
for (const [i, p] of odysseeImportedProducts.entries()) {
  const $ = load(p.description || '');
  const type = $('strong').filter((_, n) => $(n).text().trim().replace(/:$/, '').trim() === 'Type de produit').parent();
  const subtype = $('strong').filter((_, n) => $(n).text().trim().replace(/:$/, '').trim() === 'Type').parent();
  const typeLabel = type.text().split(':').slice(1).join(':').trim();
  const subtypeLabel = subtype.text().split(':').slice(1).join(':').trim();
  type.remove(); subtype.remove();
  const category = /papier/i.test(typeLabel) ? 'papier-peint' : 'tissu';
  docs.push({ _id: `odc.product.${p.id}`, _type: 'product', legacyId: p.id, title: p.title, slug: { _type: 'slug', current: p.urlSlug },
    brand: { _type: 'reference', _ref: brands.get(p.brand) }, category: { _type: 'reference', _ref: `odc.collection.${category}` }, subtype: subtypeLabel,
    description: rich($('body').html()), visible: p.published !== false, unavailable: Boolean(p.soldOut), order: i,
    images: (p.images || []).map((im, j) => ({ _key: `image-${j}`, ...image(im.assetUrl, im.title || p.title) })),
    colorways: (p.colorways || []).map((c, colorwayIndex) => ({ _key: key(c.id + ":" + colorwayIndex), _type: 'colorway', legacyId: c.id, label: c.label, sku: c.sku, description: rich(c.description), unavailable: Boolean(c.soldOut), images: (c.images || []).map((im, j) => ({ _key: `image-${j}`, ...image(im.assetUrl, im.title || c.label) })) }))
  });
}
for (const def of pageDefinitions) {
  const $ = load(await fs.readFile(def.file, 'utf8'));
  const page = { _id: `odc.page.${def.id}`, _type: 'sitePage', title: def.title, path: def.path, template: def.id, legacyPage: true, texts: [], media: [], links: [], seo: { _type: 'seo', title: $('title').text(), description: $('meta[name="description"]').attr('content') || '', noIndex: false } };
  const root = $('main');
  const rootExcluded = '.product-list, .odc-ambiances-carousel__track, .odc-contract-story';
  const selectorFor = (node, prefix, i) => {
    const id = `${prefix}-${i}`; $(node).attr('data-odc-cms', id); return `[data-odc-cms="${id}"]`;
  };
  root.find('h1,h2,h3,h4,p,button,a').each((i, node) => {
    const el = $(node); if (el.closest(rootExcluded).length || el.find('p,h1,h2,h3,button').length || !el.text().trim()) return;
    const text = el.text().trim().replace(/\s+/g, ' ');
    page.texts.push({ _key: `text-${i}`, _type: 'pageText', label: text.slice(0, 85), selector: selectorFor(node, 'text', i), value: rich(`<p>${el.html()}</p>`) });
  });
  root.find('img,video source,video[poster]').each((i, node) => {
    const el = $(node); if (el.closest(rootExcluded).length) return;
    const isFile = node.tagName === 'source';
    const url = el.attr('src') || el.attr('data-src') || el.attr('poster'); if (!url) return;
    const alt = el.attr('alt') || `Média ${i + 1}`;
    page.media.push({ _key: `media-${i}`, _type: 'pageMedia', label: isFile ? 'Vidéo de la page' : alt, selector: selectorFor(node, 'media', i), kind: isFile ? 'file' : 'image', ...(isFile ? { file: { _type: 'managedFile', url, label: 'Vidéo' } } : { image: image(url, alt) }) });
  });
  root.find('a[href]').each((i, node) => { const el = $(node); if (el.closest('.product-list').length) return; const id = el.attr('data-odc-cms') || `link-${i}`; el.attr('data-odc-cms', id); page.links.push({ _key: `link-${i}`, _type: 'pageLink', label: el.text().trim().slice(0, 85) || `Lien ${i + 1}`, selector: `[data-odc-cms="${id}"]`, href: el.attr('href') }); });
  if (['ambiances', 'mood-boards', 'press-book'].includes(def.id)) page.gallery = $('.odc-ambiances-carousel__track img').toArray().map((node, i) => ({ _key: `gallery-${i}`, ...image($(node).attr('src'), $(node).attr('alt')) }));
  if (def.id === 'contract') page.sections = $('.odc-contract-story__row').toArray().map((node, i) => ({ _type: 'splitSection', _key: `section-${i}`, eyebrow: $(node).find('.odc-contract-kicker').text(), title: $(node).find('h2').text(), body: rich($(node).find('.odc-contract-story__text').html()), image: image($(node).find('img').attr('src'), $(node).find('img').attr('alt')) }));
  if (def.id === 'home') page.shortcuts = DEFAULT_SITE_CONTENT.home.shortcuts.map(s => ({ _key: s.id, _type: 'shortcut', ...s, image: image(s.image, s.title.replace(/<br\s*\/?\s*>/g, ' ')) }));
  docs.push(page);
  // Stable content markers are committed; the markup itself remains the baseline.
  await fs.writeFile(def.file, $.html());
  for (const alias of def.aliases) { await fs.mkdir(new URL('../' + alias, import.meta.url).pathname.replace(/\/[^/]+$/, ''), { recursive: true }); await fs.writeFile(alias, $.html()); }
}
await fs.mkdir('tmp/sanity-secrets', { recursive: true, mode: 0o700 });
await fs.writeFile('tmp/sanity-secrets/seed-public-content.json', JSON.stringify(docs, null, 2), { mode: 0o600 });
if (new Set(docs.map(d => d._id)).size !== docs.length) throw new Error('Duplicate seeded IDs');
for (let i = 0; i < docs.length; i += 20) {
  let transaction = client.transaction(); for (const doc of docs.slice(i, i + 20)) transaction = transaction.createIfNotExists(doc);
  await transaction.commit();
}
console.log(JSON.stringify({ importedDocuments: docs.length, products: docs.filter(d => d._type === 'product').length, pages: pageDefinitions.length, backupPath }));
