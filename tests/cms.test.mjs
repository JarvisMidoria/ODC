import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { buildSnapshot, imageUrl, richHtml, safeUrl } from '../cms/content-model.js';
import { normalizeSanityCallback } from '../cms/auth-callback.js';
import { odysseeImportedProducts } from '../src/product-catalog-odyssee-imported.js';
import { JSDOM } from 'jsdom';
import { applyPageToDom } from '../cms/page-render.js';

const data = JSON.parse(fs.readFileSync(new URL('../src/cms-published.json', import.meta.url)));
test('CMS import preserves all legacy product and favorite selection identities', () => {
  const snapshot = buildSnapshot(data.documents, data.assets);
  assert.equal(snapshot.products.length, odysseeImportedProducts.length);
  for (const old of odysseeImportedProducts) {
    const product = snapshot.products.find(p => p.id === old.id);
    assert.ok(product, old.id);
    assert.equal(product.fullUrl, old.fullUrl);
    assert.deepEqual(product.colorways.map(c => c.id), old.colorways.map(c => c.id));
    assert.equal(product.images.length, old.images.length);
    product.colorways.forEach((c, index) => assert.equal(c.images.length, old.colorways[index].images.length));
  }
  assert.equal(snapshot.pages.length, 11);
});
test('published content excludes drafts, respects hiding/availability and escapes editable markup', () => {
  const productDoc = data.documents.find(d => d._type === 'product');
  const modified = data.documents.map(d => d._id === productDoc._id ? { ...d, unavailable: true, colorways: d.colorways.map((c, i) => i ? c : { ...c, unavailable: true }) } : d);
  const snapshot = buildSnapshot([...modified, { ...productDoc, _id: `drafts.${productDoc._id}`, title: 'DRAFT MUST STAY PRIVATE' }], data.assets);
  assert.equal(snapshot.products.length, 100);
  assert.ok(snapshot.products.find(p => p.cmsId === productDoc._id).soldOut);
  assert.ok(snapshot.products.find(p => p.cmsId === productDoc._id).colorways[0].soldOut);
  assert.ok(!JSON.stringify(snapshot).includes('DRAFT MUST STAY PRIVATE'));
  assert.equal(buildSnapshot(modified.map(d => d._id === productDoc._id ? { ...d, visible: false } : d), data.assets).products.length, 99);
  assert.equal(safeUrl('javascript:alert(1)'), ''); assert.equal(safeUrl('//untrusted.example'), '');
  const malicious = [{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: '<script>bad()</script>', marks: [] }], markDefs: [] }];
  assert.ok(!richHtml(malicious).includes('<script>'));
  assert.match(imageUrl({ image: { asset: { _ref: 'image-hash-1000x1000-jpg' }, crop: { left: .1, right: .1, top: .2, bottom: 0 } } }, { 'image-hash-1000x1000-jpg': 'https://cdn.sanity.io/images/project/production/hash-1000x1000.jpg' }), /rect=100%2C200%2C800%2C800/);
});
test('page edits update visible content, media alt text, galleries and sections without arbitrary selectors', () => {
  const dom = new JSDOM('<h1 data-odc-cms="text-1">Old</h1><img data-odc-cms="media-1"><div class="odc-ambiances-carousel__track"></div><section data-cms-sections></section>', { url: 'https://www.odyssee.ma/' });
  const value = [{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'New headline', marks: [] }], markDefs: [] }];
  applyPageToDom({ texts: [{ selector: '[data-odc-cms="text-1"]', value }, { selector: 'body', value: [] }], media: [{ selector: '[data-odc-cms="media-1"]', kind: 'image', image: { url: '/photo.jpg', alt: 'New image description' } }], gallery: [{ url: '/gallery.jpg', alt: 'Gallery' }], sections: [{ title: 'New section', body: value, image: { url: '/section.jpg' } }] }, {}, dom.window.document);
  assert.equal(dom.window.document.querySelector('h1').textContent, 'New headline');
  assert.equal(dom.window.document.querySelector('img').alt, 'New image description');
  assert.equal(dom.window.document.querySelectorAll('.odc-ambiances-slide').length, 1);
  assert.equal(dom.window.document.querySelector('[data-cms-sections] h2').textContent, 'New section');
});
test('Vercel legacy auth callback normalizes only Sanity session exchange URLs', () => {
  const sid = 'testsession'.repeat(5);
  const callback = `https://api.sanity.io/v1/auth/fetch?sid=${sid}`;
  const normalized = new URL(normalizeSanityCallback(`https://www.odyssee.ma/admin/?url=${encodeURIComponent(callback)}`));
  assert.equal(normalized.searchParams.has('url'), false);
  assert.equal(normalized.hash, `#sid=${sid}`);
  assert.equal(normalizeSanityCallback(`https://www.odyssee.ma/admin/?url=${encodeURIComponent(callback.replace('api.sanity.io', 'evil.example'))}`), null);
});
