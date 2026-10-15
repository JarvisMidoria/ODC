import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@sanity/client';
import { CONTENT_TYPES } from '../cms/content-model.js';

const client = createClient({ projectId: process.env.SANITY_API_PROJECT_ID, dataset: process.env.SANITY_API_DATASET, token: process.env.SANITY_API_WRITE_TOKEN, apiVersion: '2025-02-19', useCdn: false });
if (client.config().projectId !== 've9xrq77' || !client.config().token) throw new Error('Expected Odyssée CMS credentials');
const docs = await client.fetch('*[_type in $types && !(_id in path("drafts.**"))]', { types: CONTENT_TYPES });
const urls = new Map();
function find(value) {
  if (Array.isArray(value)) return value.forEach(find);
  if (!value || typeof value !== 'object') return;
  if (['managedImage', 'managedFile'].includes(value._type) && value.url && !value.image?.asset && !value.file?.asset) urls.set(value.url, value._type === 'managedImage' ? 'image' : 'file');
  Object.values(value).forEach(find);
}
docs.forEach(find);
const statePath = 'tmp/sanity-secrets/media-import.json';
let results = {};
try { results = JSON.parse(await fs.readFile(statePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
let complete = 0;
const queue = [...urls];
async function save() { await fs.writeFile(statePath, JSON.stringify(results), { mode: 0o600 }); }
async function worker() {
  while (queue.length) {
    const [url, type] = queue.shift();
    if (results[url]?.id) { complete++; continue; }
    try {
      let buffer;
      let filename;
      if (url.startsWith('/') && !url.startsWith('//')) {
        const local = path.resolve('public', `.${url}`);
        if (!local.startsWith(path.resolve('public') + path.sep)) throw new Error('Invalid local media path');
        buffer = await fs.readFile(local); filename = path.basename(local);
      } else {
        const remote = new URL(url);
        if (remote.protocol !== 'https:') throw new Error('Unsupported media URL');
        const response = await fetch(remote, { signal: AbortSignal.timeout(25_000) });
        if (!response.ok) throw new Error(`Download HTTP ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer()); filename = path.basename(remote.pathname) || 'image.jpg';
      }
      const asset = await client.assets.upload(type, buffer, { filename, source: { id: createHash('sha256').update(url).digest('hex'), name: 'odyssee-site-import' } });
      results[url] = { id: asset._id, url: asset.url };
    } catch (error) { results[url] = { error: error.statusCode || error.code || 'MEDIA_UNAVAILABLE' }; }
    complete++;
    if (complete % 50 === 0) { await save(); console.log(`Media import: ${complete}/${urls.size}`); }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
await save();
function attach(value) {
  if (Array.isArray(value)) return value.map(attach);
  if (!value || typeof value !== 'object') return value;
  const next = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, attach(child)]));
  const asset = results[value.url];
  if (asset?.id && ['managedImage', 'managedFile'].includes(value._type)) next[value._type === 'managedImage' ? 'image' : 'file'] = { _type: value._type === 'managedImage' ? 'image' : 'file', asset: { _type: 'reference', _ref: asset.id } };
  return next;
}
// Patch only unchanged imported documents; a concurrent agency edit is never overwritten.
for (const doc of docs) {
  const updated = attach(doc);
  const fields = Object.fromEntries(Object.entries(updated).filter(([key]) => !key.startsWith('_')));
  if (JSON.stringify(fields) === JSON.stringify(Object.fromEntries(Object.entries(doc).filter(([key]) => !key.startsWith('_'))))) continue;
  await client.patch(doc._id).ifRevisionId(doc._rev).set(fields).commit();
}
const failures = Object.entries(results).filter(([, result]) => !result.id);
console.log(JSON.stringify({ uniqueMedia: urls.size, uploaded: Object.values(results).filter(r => r.id).length, unresolved: failures.length, fallback: 'Existing URLs retained for unresolved assets' }));
