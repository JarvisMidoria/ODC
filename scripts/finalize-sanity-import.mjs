import fs from 'node:fs/promises';
import { createClient } from '@sanity/client';
import { load } from 'cheerio';
const client = createClient({ projectId: process.env.SANITY_API_PROJECT_ID, dataset: process.env.SANITY_API_DATASET, token: process.env.SANITY_API_WRITE_TOKEN, apiVersion: '2025-02-19', useCdn: false });
if (client.config().projectId !== 've9xrq77') throw new Error('Wrong CMS project');
let fixed = 0;
for (const p of await client.fetch('*[_type == "product"]')) {
  const seen = new Set();
  if ((p.colorways || []).some(c => seen.has(c._key) || !seen.add(c._key))) {
    await client.patch(p._id).ifRevisionId(p._rev).set({ colorways: p.colorways.map((c, i) => ({ ...c, _key: `${c._key}-${i}` })) }).commit();
    fixed++;
  }
}
const $ = load(await fs.readFile('contract/clients/index.html', 'utf8'));
const media = JSON.parse(await fs.readFile('tmp/sanity-secrets/media-import.json', 'utf8'));
const groups = $('.odc-contract-clients__group').toArray().map((node, i) => ({ _type: 'clientGroup', _key: `group-${i}`, eyebrow: $(node).find('.odc-contract-kicker').text(), title: $(node).find('h2').text(), logos: $(node).find('img').toArray().map((img, j) => {
  const url = $(img).attr('src'); const asset = media[url];
  return { _key: `logo-${j}`, _type: 'managedImage', url, alt: $(img).attr('alt'), ...(asset?.id ? { image: { _type: 'image', asset: { _type: 'reference', _ref: asset.id } } } : {}) };
}) }));
await client.patch('odc.page.clients').setIfMissing({ clientGroups: groups }).commit();
console.log(JSON.stringify({ correctedArrayKeysWithoutChangingFavoriteIds: fixed, clientGroups: groups.length }));
