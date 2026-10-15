import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@sanity/client';
const client = createClient({ projectId: process.env.SANITY_API_PROJECT_ID, dataset: process.env.SANITY_API_DATASET, token: process.env.SANITY_API_READ_TOKEN, apiVersion: '2025-02-19', useCdn: false, perspective: 'raw' });
if (client.config().projectId !== 've9xrq77' || !client.config().token) throw new Error('Expected authenticated Odyssée CMS export');
const output = path.resolve('data/archives', `sanity-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(output, { recursive: false, mode: 0o700 });
const documents = [];
let cursor = '';
while (true) {
  const batch = await client.fetch('*[_id > $cursor] | order(_id asc)[0...500]', { cursor });
  if (!batch.length) break;
  documents.push(...batch); cursor = batch.at(-1)._id;
}
const raw = documents.map(doc => JSON.stringify(doc)).join('\n') + '\n';
await fs.writeFile(path.join(output, 'documents.ndjson'), raw, { mode: 0o600 });
const assets = documents.filter(doc => ['sanity.imageAsset', 'sanity.fileAsset'].includes(doc._type)).map(doc => ({ id: doc._id, url: doc.url, filename: doc.originalFilename, sha1hash: doc.sha1hash }));
await fs.writeFile(path.join(output, 'assets.json'), JSON.stringify(assets, null, 2), { mode: 0o600 });
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify({ projectId: client.config().projectId, dataset: client.config().dataset, exportedAt: new Date().toISOString(), documents: documents.length, assetReferences: assets.length, sha256: createHash('sha256').update(raw).digest('hex'), note: 'Content export and asset inventory; media binaries remain in Sanity. Use sanity dataset export with assets for a fully independent media archive.' }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ output, documents: documents.length, assetReferences: assets.length }));
