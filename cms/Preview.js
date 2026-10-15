import React, { useEffect, useRef, useState } from 'react';
import { useClient } from 'sanity';

export function Preview({ document: doc }) {
  const client = useClient({ apiVersion: '2025-02-19' });
  const frame = useRef(null);
  const [payload, setPayload] = useState(null);
  const value = doc?.displayed;
  const raw = JSON.stringify(value || {});
  const path = value?._type === 'product' ? `/product.html?product=${encodeURIComponent(value.legacyId || value._id?.replace(/^drafts\./, ''))}` : value?.legacyPage ? value.path : `/cms-preview.html?document=${encodeURIComponent(value?._id?.replace(/^drafts\./, '') || '')}`;
  const url = `${window.location.origin}${path}${path.includes('?') ? '&' : '?'}_odcPreview=1`;
  const send = () => { if (payload) frame.current?.contentWindow?.postMessage({ type: 'odc-cms-preview', ...payload }, window.location.origin); };
  useEffect(() => {
    let active = true;
    const refs = [...new Set([...raw.matchAll(/"_ref":"((?:image|file)-[^" ]+)"/g)].map(match => match[1]))];
    client.fetch('*[_id in $refs]{_id,url}', { refs }).then(assets => { if (active) setPayload({ document: JSON.parse(raw), assets }); }).catch(() => { if (active) setPayload({ document: JSON.parse(raw), assets: [] }); });
    return () => { active = false; };
  }, [raw, client]);
  useEffect(send, [payload]);
  if (!['product', 'sitePage'].includes(value?._type)) return React.createElement('p', { style: { padding: 24 } }, 'Consultez le site après publication pour vérifier ces réglages globaux.');
  if (value?._type === 'product' && !value.slug?.current) return React.createElement('p', { style: { padding: 24 } }, 'Renseignez le nom et l’adresse de la fiche pour afficher la prévisualisation.');
  return React.createElement('div', { style: { height: '100%', display: 'flex', flexDirection: 'column' } },
    React.createElement('p', { style: { padding: '8px 16px', margin: 0, fontSize: 13 } }, 'Brouillon : cette prévisualisation ne modifie pas le site public.'),
    React.createElement('iframe', { ref: frame, src: url, onLoad: send, title: 'Prévisualisation du brouillon Odyssée', style: { flex: 1, border: 0, width: '100%', minHeight: 650 } })
  );
}
