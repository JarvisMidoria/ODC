import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './cms/schema.js';
import { Preview } from './cms/Preview.js';
import { frFRLocale } from '@sanity/locale-fr-fr';

export default defineConfig({
  name: 'odyssee', title: 'Odyssée — Gestion du site', projectId: 've9xrq77', dataset: 'production', basePath: '/admin',
  tasks: { enabled: false }, releases: { enabled: false }, scheduledDrafts: { enabled: false }, scheduledPublishing: { enabled: false },
  plugins: [frFRLocale(), structureTool({
    structure: S => S.list().title('Odyssée').items([
      S.listItem().title('Pages du site').child(S.documentTypeList('sitePage').title('Pages du site')),
      S.divider(),
      S.listItem().title('Produits et coloris').child(S.documentTypeList('product').title('Produits et coloris').defaultOrdering([{ field: 'order', direction: 'asc' }])),
      S.listItem().title('Catégories du catalogue').child(S.documentTypeList('collection').title('Catégories')),
      S.listItem().title('Marques partenaires').child(S.documentTypeList('brand').title('Marques partenaires')),
      S.divider(),
      S.listItem().title('Navigation, logos et coordonnées').child(S.document().schemaType('siteSettings').documentId('odc.settings').title('Réglages du site'))
    ]),
    defaultDocumentNode: (S, { schemaType }) => S.document().views(['sitePage', 'product'].includes(schemaType) ? [S.view.form(), S.view.component(Preview).title('Prévisualiser')] : [S.view.form()])
  })],
  schema: { types: schemaTypes, templates: templates => templates.filter(t => t.schemaType !== 'siteSettings') },
  document: { comments: { enabled: false }, actions: (actions, { schemaType }) => schemaType === 'siteSettings' ? actions.filter(action => !['delete', 'duplicate', 'unpublish'].includes(action.action)) : actions }
});
