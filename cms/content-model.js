import { toHTML } from '@portabletext/to-html';

export const CONTENT_TYPES = ['siteSettings', 'sitePage', 'product', 'brand', 'collection'];
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function safeUrl(value, fallback = '') {
  const url = String(value || '').trim();
  if (/^(\/(?!\/)|https?:\/\/|mailto:|tel:|#)/i.test(url) && !/[\u0000-\u001f"<>]/.test(url)) return url;
  return fallback;
}
export function richHtml(value) {
  return toHTML(Array.isArray(value) ? value : [], { components: {
    marks: { link: ({ value, children }) => `<a href="${escapeHtml(safeUrl(value?.href, '#'))}">${children}</a>` },
    unknownType: () => '', unknownMark: ({ children }) => children, unknownBlockStyle: ({ children }) => `<p>${children}</p>`
  }, onMissingComponent: false });
}
export const plainText = value => (value || []).map(block => (block.children || []).map(span => span.text || '').join('')).join('\n');
export function imageUrl(media, assets = {}) {
  const base = safeUrl(assets[media?.image?.asset?._ref] || media?.image?.asset?.url || media?.url);
  if (!base.startsWith('https://cdn.sanity.io/images/')) return base;
  const url = new URL(base); url.searchParams.set('auto', 'format'); url.searchParams.set('w', '1800');
  const dimensions = media?.image?.asset?._ref?.match(/-(\d+)x(\d+)-[^-]+$/);
  const crop = media?.image?.crop;
  if (dimensions && crop) {
    const w = Number(dimensions[1]), h = Number(dimensions[2]);
    const left = Math.round(w * (crop.left || 0)), top = Math.round(h * (crop.top || 0));
    url.searchParams.set('rect', `${left},${top},${Math.max(1,Math.round(w*(1-(crop.left||0)-(crop.right||0))))},${Math.max(1,Math.round(h*(1-(crop.top||0)-(crop.bottom||0))))}`);
  }
  return url.href;
}
export function fileUrl(media, assets = {}) { return safeUrl(assets[media?.file?.asset?._ref] || media?.file?.asset?.url || media?.url); }

export function buildSnapshot(documents, assetList = []) {
  const docs = documents.filter(doc => CONTENT_TYPES.includes(doc._type) && !doc._id.startsWith('drafts.') && !doc._id.startsWith('versions.'));
  const assets = Array.isArray(assetList) ? Object.fromEntries(assetList.map(item => [item._id, item.url])) : assetList;
  const ofType = type => docs.filter(doc => doc._type === type);
  const byId = new Map(docs.map(doc => [doc._id, doc]));
  const resolveImage = media => ({ assetUrl: imageUrl(media, assets), title: media?.alt || '', originalSize: '', mediaFocalPoint: { x: 0.5, y: 0.5 } });
  const settings = ofType('siteSettings').find(item => item._id === 'odc.settings') || {};
  const collections = ofType('collection').sort((a, b) => (a.order || 0) - (b.order || 0)).filter(c => /^[a-z0-9-]+$/.test(c.key || '')).map(c => ({ ...c, id: c.key, path: c.key === 'all' ? '/produits' : `/produits/${c.key}` }));
  const products = ofType('product').filter(p => p.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0)).map(p => {
    const category = byId.get(p.category?._ref);
    const brand = byId.get(p.brand?._ref);
    const slug = p.slug?.current;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) throw new Error(`Invalid product slug: ${p._id}`);
    const images = (p.images || []).map(resolveImage).filter(image => image.assetUrl);
    return {
      id: p.legacyId || p._id, cmsId: p._id, title: p.title || '', brand: brand?.title || '', categoryId: category?.key || 'tissu',
      fullUrl: `/produits/p/${slug}`, urlSlug: slug, price: null, salePrice: null, soldOut: Boolean(p.unavailable), onSale: false,
      description: `<p><strong>Type de produit:</strong> ${escapeHtml(category?.typeLabel || category?.title || 'Tissu')}</p><p><strong>Type:</strong> ${escapeHtml(p.subtype || '')}</p>${richHtml(p.description)}`,
      images, mainImage: images[0], variants: [], firstInStockVariant: null, userDefinedVariantOptions: [], productType: 1,
      qtyInStock: p.unavailable ? 0 : Number.MAX_SAFE_INTEGER, allowMultiplePurchase: true, scarce: false, published: true,
      tags: [brand?.title, category?.typeLabel, p.subtype].filter(Boolean), collections: ['all', category?.key].filter(Boolean), seo: p.seo || {},
      colorways: (p.colorways || []).map(c => {
        const photos = (c.images || []).map(resolveImage).filter(image => image.assetUrl);
        return { id: c.legacyId || c._key, label: c.label || '', sku: c.sku || '', description: richHtml(c.description), images: photos, mainImage: photos[0], price: null, salePrice: null, soldOut: Boolean(c.unavailable) };
      })
    };
  });
  const slugs = new Set();
  for (const p of products) { if (slugs.has(p.urlSlug)) throw new Error(`Duplicate product slug: ${p.urlSlug}`); slugs.add(p.urlSlug); }
  const brands = ofType('brand').filter(b => b.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0)).map(b => ({
    alt: b.title, href: safeUrl(b.href, '#'), src: imageUrl(b.logo, assets),
    width: '104px', height: '24px', basis: '122px', scale: '1', gridWidth: '214px', gridHeight: '60px', ...b.layout
  }));
  const pages = ofType('sitePage');
  if (new Set(pages.map(p => p.path)).size !== pages.length) throw new Error('Duplicate CMS page address');
  if (new Set(collections.map(c => c.id)).size !== collections.length) throw new Error('Duplicate category identifier');
  const home = pages.find(p => p.template === 'home');
  return { settings: {
    ...settings,
    logo: imageUrl(settings.logo, assets), footerLogo: imageUrl(settings.footerLogo, assets), contractLogo: imageUrl(settings.contractLogo, assets),
    navigation: (settings.navigation || []).map(n => ({ ...n, href: safeUrl(n.href, '/'), matches: [n.href, n.href?.replace(/\/$/, ''), `${n.href?.replace(/\/$/, '')}.html`] })),
    contractNavigation: (settings.contractNavigation || []).map(n => ({ ...n, href: safeUrl(n.href, '/contract/'), matches: [n.href, n.href?.replace(/\/$/, ''), `${n.href?.replace(/\/$/, '')}.html`] }))
  }, collections, products, brands, pages, assets,
    siteContent: { home: { shortcuts: (home?.shortcuts || []).map(s => ({ id: s.id || s._key, title: s.title, href: safeUrl(s.href, '/'), image: imageUrl(s.image, assets) })) }, showrooms: { cities: (settings.showrooms || []).map(s => s.city) } }
  };
}
