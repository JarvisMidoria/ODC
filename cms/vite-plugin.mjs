import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
import { buildSnapshot, escapeHtml, imageUrl, fileUrl, safeUrl } from './content-model.js';
import { selectorAllowed, inlineRichHtml, galleryHtml, sectionsHtml, clientGroupsHtml } from './page-render.js';
import { pageDefinitions } from './pages.js';

export function sanityContentPlugin() {
  let snapshot;
  let outputDirectory;
  return {
    name: 'odyssee-sanity-content',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        if (/^\/admin(?:\/|$)/.test(url.pathname)) req.url = `/admin/index.html${url.search}`;
        if (['/admin.html', '/admin-inbox', '/admin-inbox/', '/admin-inbox.html'].includes(url.pathname)) {
          res.statusCode = 302; res.setHeader('Location', '/admin/'); res.end(); return;
        }
        next();
      });
    },
    async configResolved(config) {
      snapshot = buildSnapshot(...await fs.readFile('src/cms-published.json', 'utf8').then(raw => { const d = JSON.parse(raw); return [d.documents, d.assets]; }));
      outputDirectory = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: { order: 'pre', handler(html, context) {
      const relative = path.relative(process.cwd(), context.filename || '').replaceAll(path.sep, '/');
      const def = pageDefinitions.find(d => [d.file, ...d.aliases].includes(relative));
      let page = snapshot.pages.find(p => p._id === `odc.page.${def?.id}`);
      if (!page) page = snapshot.pages.find(p => p.path !== '/' && `${p.path}index.html`.slice(1) === relative);
      const $ = load(html);
      if (relative.startsWith('admin/') || relative === 'admin.html' || relative === 'cms-preview.html') return html;
      if ($('.product-list-layout-container').length) {
        const category = snapshot.collections.find(c => relative === `${c.path.slice(1)}/index.html`);
        const items = category && category.id !== 'all' ? snapshot.products.filter(p => p.categoryId === category.id) : snapshot.products;
        $('.product-list-layout-container').html(`<div class="odc-product-grid">${items.map(product => `<article class="odc-product-card"><a class="odc-product-card__open" href="${escapeHtml(product.fullUrl)}"><div class="odc-product-card__media"><img class="odc-product-card__image odc-product-card__image--primary" src="${escapeHtml(product.mainImage?.assetUrl)}" alt="${escapeHtml(product.mainImage?.title || product.title)}" loading="lazy"></div><div class="odc-product-card__meta"><h2 class="odc-product-card__title">${escapeHtml(product.title)}</h2></div></a></article>`).join('')}</div>`);
      }
      if (page) {
        for (const field of page.texts || []) if (selectorAllowed(field.selector)) $(field.selector).html(inlineRichHtml(field.value));
        for (const field of page.media || []) {
          if (!selectorAllowed(field.selector)) continue;
          const node = $(field.selector);
          const url = field.kind === 'file' ? fileUrl(field.file, snapshot.assets) : imageUrl(field.image, snapshot.assets);
          if (!url) continue;
          if (node.is('source')) node.attr('src', url).attr('data-src', url);
          else node.attr('src', url).attr('data-src', url).attr('srcset', url).attr('alt', field.image?.alt || '');
        }
        for (const field of page.links || []) if (selectorAllowed(field.selector)) $(field.selector).attr('href', safeUrl(field.href, '#'));
        if (Array.isArray(page.gallery) && (page.gallery.length || page.template !== 'press-book')) $('.odc-ambiances-carousel__track').html(galleryHtml(page, snapshot.assets));
        if (Array.isArray(page.sections)) $('.odc-contract-story, [data-cms-sections]').html(sectionsHtml(page, snapshot.assets));
        if (Array.isArray(page.clientGroups)) $('.odc-contract-clients__sections').html(clientGroupsHtml(page, snapshot.assets));
        if (!page.legacyPage) $('[data-cms-page-title]').text(page.title);
        $('title').text(page.seo?.title || `${page.title} — Odyssée`);
        $('meta[name="description"],link[rel="canonical"],meta[property^="og:"],meta[name="robots"]').remove();
        const meta = (key, value, attribute = 'name') => $('head').append(`<meta ${attribute}="${key}" content="${escapeHtml(value)}">`);
        meta('description', page.seo?.description || '');
        meta('robots', page.seo?.noIndex ? 'noindex,follow' : 'index,follow');
        meta('og:title', page.seo?.title || page.title, 'property'); meta('og:description', page.seo?.description || '', 'property');
        meta('og:url', `https://www.odyssee.ma${page.path}`, 'property'); meta('og:type', 'website', 'property');
        const shareImage = imageUrl(page.seo?.shareImage, snapshot.assets); if (shareImage) meta('og:image', new URL(shareImage, 'https://www.odyssee.ma').href, 'property');
        $('head').append(`<link rel="canonical" href="https://www.odyssee.ma${escapeHtml(page.path)}">`);
      }
      return $.html();
    } },
    async closeBundle() {
      // The CMS is authoritative: unpublished legacy items must not survive as old HTML.
      const publishedSlugs = new Set(snapshot.products.map(p => p.urlSlug));
      const productRoot = path.join(outputDirectory, 'produits/p');
      for (const entry of await fs.readdir(productRoot).catch(() => [])) if (!publishedSlugs.has(entry)) await fs.rm(path.join(productRoot, entry), { recursive: true, force: true });
      for (const def of pageDefinitions) if (!snapshot.pages.some(p => p._id === `odc.page.${def.id}`)) for (const file of [def.file, ...def.aliases]) await fs.rm(path.join(outputDirectory, file), { force: true });
      const paths = [...snapshot.pages.filter(p => !p.seo?.noIndex).map(p => p.path), ...snapshot.collections.filter(c => c.key !== 'all').map(c => `${c.path}/`), ...snapshot.products.filter(p => !p.seo?.noIndex).map(p => p.fullUrl)];
      await fs.writeFile(path.join(outputDirectory, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map(p => `<url><loc>https://www.odyssee.ma${escapeHtml(p)}</loc></url>`).join('')}</urlset>`);
      await fs.writeFile(path.join(outputDirectory, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /cms-preview.html\nSitemap: https://www.odyssee.ma/sitemap.xml\n');
    }
  };
}
