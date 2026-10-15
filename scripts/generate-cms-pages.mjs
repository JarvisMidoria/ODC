import fs from 'node:fs/promises';
import path from 'node:path';
import { buildSnapshot, escapeHtml } from '../cms/content-model.js';
import { pageDefinitions } from '../cms/pages.js';

const published = JSON.parse(await fs.readFile('src/cms-published.json', 'utf8'));
const snapshot = buildSnapshot(published.documents, published.assets);
const generic = await fs.readFile('cms-preview.html', 'utf8');
for (const page of snapshot.pages.filter(p => !p.legacyPage)) {
  if (!/^\/(?:[a-z0-9-]+\/)+$/.test(page.path || '') || /^\/(admin|api|assets|src|produits|contract)(\/|$)/.test(page.path)) throw new Error('Reserved or invalid CMS page path');
  const filename = path.join(page.path.slice(1), 'index.html');
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, generic.replace('Prévisualisation — Odyssée', escapeHtml(page.title)));
}
const baseCollection = await fs.readFile('produits.html', 'utf8');
for (const c of snapshot.collections.filter(c => c.id !== 'all')) {
  const filename = `produits/${c.id}/index.html`;
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, baseCollection.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(c.seo?.title || `${c.title} — Odyssée`)}</title>`));
}
console.log('CMS product categories and additional pages generated.');
