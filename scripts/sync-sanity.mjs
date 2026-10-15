import fs from 'node:fs/promises';
import { createClient } from '@sanity/client';
import { buildSnapshot, CONTENT_TYPES } from '../cms/content-model.js';

const projectId = process.env.SANITY_API_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID;
const dataset = process.env.SANITY_API_DATASET || process.env.VITE_SANITY_DATASET;
if (!projectId || !dataset) throw new Error('Sanity configuration missing; refusing to build a stale or empty site.');
const client = createClient({ projectId, dataset, token: process.env.SANITY_API_READ_TOKEN, apiVersion: '2025-02-19', useCdn: false, perspective: 'published' });
const data = await client.fetch('{"documents": *[_type in $types], "assets": *[_type in ["sanity.imageAsset", "sanity.fileAsset"]]{_id,url}}', { types: CONTENT_TYPES });
const snapshot = buildSnapshot(data.documents, data.assets);
if (!snapshot.settings._id || !snapshot.pages.some(p => p.path === '/') || !snapshot.collections.length) throw new Error('Incomplete CMS configuration; keeping the current deployment.');
await fs.writeFile('src/cms-published.json', JSON.stringify(data));
console.log(`Sanity published content: ${snapshot.pages.length} pages, ${snapshot.products.length} products, ${snapshot.products.reduce((n,p) => n+p.colorways.length,0)} colorways.`);
