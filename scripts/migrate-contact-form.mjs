import fs from 'node:fs/promises';
import { createClient } from '@sanity/client';
import { DEFAULT_CONTACT_FIELDS } from '../lib/contact-form.js';

// Add only missing settings; never reset content or overwrite an agency draft.
const draftOnly = process.argv.includes('--draft-only');
if (!process.env.SANITY_API_WRITE_TOKEN) throw new Error('Private Sanity editor token required.');
const client = createClient({ projectId: process.env.SANITY_API_PROJECT_ID, dataset: process.env.SANITY_API_DATASET, token: process.env.SANITY_API_WRITE_TOKEN, apiVersion: '2025-02-19', useCdn: false, perspective: 'raw' });
const ids = ['odc.settings', 'drafts.odc.settings'];
const documents = await client.fetch('*[_id in $ids]', { ids });
const published = documents.find(doc => doc._id === ids[0]);
if (!published) throw new Error('Published site settings missing; refusing migration.');
const archive = `data/archives/contact-form-before-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await fs.mkdir(archive, { recursive: true, mode: 0o700 });
await fs.writeFile(`${archive}/settings.json`, JSON.stringify(documents, null, 2), { mode: 0o600 });
const defaults = { contactFields: DEFAULT_CONTACT_FIELDS, contactSubmitLabel: 'Envoyer' };
if (draftOnly && !documents.some(doc => doc._id === ids[1])) {
  const { _rev, _createdAt, _updatedAt, ...copy } = published;
  await client.createIfNotExists({ ...defaults, ...copy, _id: ids[1] });
  console.log('Contact settings draft prepared; published content unchanged.');
} else {
  for (const doc of documents.filter(doc => !draftOnly || doc._id === ids[1])) {
    await client.patch(doc._id).ifRevisionId(doc._rev).setIfMissing(defaults).commit();
    console.log(`Missing contact settings initialized: ${doc._id}.`);
  }
}
console.log(`Private backup: ${archive}/settings.json`);
