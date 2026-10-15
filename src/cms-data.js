import published from './cms-published.json';
import { buildSnapshot } from '../cms/content-model.js';

let documents = published.documents;
let assets = published.assets;
const preview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('_odcPreview') === '1' && window.parent !== window;
if (preview) {
  try {
    const draft = JSON.parse(window.sessionStorage.getItem('odc-cms-preview') || 'null');
    if (draft?.document) {
      const doc = { ...draft.document, _id: draft.document._id.replace(/^drafts\./, '') };
      documents = [...documents.filter(d => d._id !== doc._id), doc];
      const assetMap = new Map([...assets, ...(draft.assets || [])].map(asset => [asset._id, asset]));
      assets = [...assetMap.values()];
    }
  } catch { /* A disabled session store must not affect the public site. */ }
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'odc-cms-preview' || !event.data.document?._type) return;
    const raw = JSON.stringify({ document: event.data.document, assets: event.data.assets || [] });
    try {
      if (window.sessionStorage.getItem('odc-cms-preview') !== raw) { window.sessionStorage.setItem('odc-cms-preview', raw); window.location.reload(); }
    } catch { /* Storage-disabled preview remains on the published version. */ }
  });
}
export const cmsData = buildSnapshot(documents, assets);
export const cmsPreview = preview;
