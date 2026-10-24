import { defineType, defineField } from 'sanity';
import { DEFAULT_CONTACT_FIELDS, normalizeContactFields } from '../lib/contact-form.js';

const f = (name, title, type = 'string', extra = {}) => defineField({ name, title, type, ...extra });
const required = rule => rule.required();
const safeUrl = rule => rule.uri({ allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel'] });
const imageField = (name, title, extra = {}) => f(name, title, 'managedImage', extra);
const array = (name, title, type, extra = {}) => f(name, title, 'array', { of: [{ type }], ...extra });
const conditional = kind => ({ hidden: ({ parent }) => parent?.kind !== kind });

export const schemaTypes = [
  defineType({ name: 'contactFormOption', title: 'Choix de réponse', type: 'object', fields: [
    f('label', 'Libellé du choix', 'string', { validation: rule => rule.required().max(160) }),
    f('value', 'Identifiant conservé', 'string', { hidden: true, readOnly: true })
  ], preview: { select: { title: 'label' } } }),
  defineType({ name: 'contactFormField', title: 'Champ du formulaire', type: 'object', fields: [
    f('label', 'Libellé du champ', 'string', { validation: rule => rule.required().max(160) }),
    f('type', 'Type de réponse', 'string', { validation: required, options: { list: [
      { title: 'Texte court', value: 'text' }, { title: 'Adresse email', value: 'email' }, { title: 'Téléphone', value: 'tel' },
      { title: 'Texte long / message', value: 'textarea' }, { title: 'Liste de choix', value: 'select' },
      { title: 'Case à cocher', value: 'checkbox' }, { title: 'Nombre', value: 'number' }
    ] } }),
    f('required', 'Réponse obligatoire', 'boolean', { initialValue: false, description: 'Pour une case à cocher, le visiteur devra cocher la case.' }),
    f('placeholder', 'Exemple ou invitation à répondre', 'string', { validation: rule => rule.max(200), hidden: ({ parent }) => parent?.type === 'checkbox' }),
    f('help', 'Texte d’aide sous le champ', 'string', { validation: rule => rule.max(300) }),
    array('options', 'Choix proposés (ordre du formulaire)', 'contactFormOption', { hidden: ({ parent }) => parent?.type !== 'select', validation: rule => rule.custom((value, context) => context.parent?.type !== 'select' || (Array.isArray(value) && value.length >= 1 && value.length <= 30) || 'Ajoutez entre 1 et 30 choix.') }),
    f('name', 'Identifiant conservé', 'string', { hidden: true, readOnly: true }),
    f('defaultValue', 'Choix initial conservé', 'string', { hidden: true, readOnly: true }),
    f('when', 'Condition conservée', 'object', { hidden: true, fields: [f('field', 'Champ'), f('value', 'Valeur')] })
  ], initialValue: { type: 'text', required: false }, preview: { select: { title: 'label', type: 'type', required: 'required' }, prepare: ({ title, type, required: mandatory }) => ({ title: title || 'Nouveau champ', subtitle: `${type || 'Texte'} · ${mandatory ? 'Obligatoire' : 'Facultatif'}` }) } }),
  defineType({ name: 'richText', title: 'Texte mis en forme', type: 'array', of: [{ type: 'block',
    styles: [{ title: 'Paragraphe', value: 'normal' }, { title: 'Titre de section', value: 'h2' }, { title: 'Sous-titre', value: 'h3' }],
    lists: [{ title: 'Liste', value: 'bullet' }, { title: 'Liste numérotée', value: 'number' }],
    marks: { decorators: [{ title: 'Gras', value: 'strong' }, { title: 'Italique', value: 'em' }], annotations: [{ name: 'link', title: 'Lien', type: 'object', fields: [f('href', 'Adresse', 'url', { validation: safeUrl })] }] }
  }] }),
  defineType({ name: 'managedImage', title: 'Image', type: 'object', fields: [
    f('image', 'Importer ou choisir une image', 'image', { options: { hotspot: true } }),
    f('url', 'Image existante (adresse)', 'string', { description: 'Conservée lors de l’import. Une image importée ci-dessus la remplace.', hidden: ({ parent }) => Boolean(parent?.image?.asset) }),
    f('alt', 'Description de l’image (accessibilité et SEO)', 'string')
  ], preview: { select: { title: 'alt', media: 'image', subtitle: 'url' } } }),
  defineType({ name: 'managedFile', title: 'Vidéo ou document', type: 'object', fields: [
    f('file', 'Importer un fichier', 'file'),
    f('url', 'Fichier existant (adresse)', 'string', { hidden: ({ parent }) => Boolean(parent?.file?.asset) }),
    f('label', 'Libellé')
  ] }),
  defineType({ name: 'seo', title: 'Référencement', type: 'object', fields: [
    f('title', 'Titre affiché dans Google', 'string', { validation: rule => rule.max(70).warning('Un titre court est plus lisible dans les résultats de recherche.') }),
    f('description', 'Description dans Google', 'text', { rows: 3, validation: rule => rule.max(180).warning('Une description courte est recommandée.') }),
    imageField('shareImage', 'Image de partage'),
    f('noIndex', 'Masquer aux moteurs de recherche', 'boolean', { initialValue: false })
  ] }),
  defineType({ name: 'pageText', title: 'Texte', type: 'object', fields: [
    f('label', 'Emplacement', 'string', { readOnly: true }), f('selector', 'Repère technique', 'string', { hidden: true }),
    f('value', 'Contenu', 'richText')
  ], preview: { select: { title: 'label' } } }),
  defineType({ name: 'pageMedia', title: 'Média', type: 'object', fields: [
    f('label', 'Emplacement', 'string', { readOnly: true }), f('selector', 'Repère technique', 'string', { hidden: true }),
    f('kind', 'Type', 'string', { hidden: true }),
    imageField('image', 'Image', conditional('image')), f('file', 'Vidéo / document', 'managedFile', conditional('file'))
  ], preview: { select: { title: 'label', media: 'image.image' } } }),
  defineType({ name: 'pageLink', title: 'Lien', type: 'object', fields: [
    f('label', 'Emplacement', 'string', { readOnly: true }), f('selector', 'Repère technique', 'string', { hidden: true }),
    f('href', 'Destination', 'url', { validation: safeUrl })
  ], preview: { select: { title: 'label', subtitle: 'href' } } }),
  defineType({ name: 'splitSection', title: 'Section texte et image', type: 'object', fields: [
    f('eyebrow', 'Surtitre'), f('title', 'Titre'), f('body', 'Texte', 'richText'), imageField('image', 'Image')
  ], preview: { select: { title: 'title', media: 'image.image' } } }),
  defineType({ name: 'colorway', title: 'Coloris', type: 'object', fields: [
    f('legacyId', 'Identifiant', 'string', { readOnly: true, hidden: true }), f('label', 'Nom du coloris', 'string', { validation: required }),
    f('sku', 'Référence'), f('description', 'Description', 'richText'), f('unavailable', 'Indisponible', 'boolean', { initialValue: false }),
    array('images', 'Photos (la première est la photo principale)', 'managedImage', { validation: rule => rule.min(1).required() })
  ], preview: { select: { title: 'label', subtitle: 'sku', media: 'images.0.image' } } }),
  defineType({ name: 'shortcut', title: 'Raccourci accueil', type: 'object', fields: [f('id', 'Identifiant', 'string', { hidden: true }), f('title', 'Titre'), f('href', 'Destination', 'url', { validation: safeUrl }), imageField('image', 'Image')], preview: { select: { title: 'title', media: 'image.image' } } }),
  defineType({ name: 'navigationLink', title: 'Lien de navigation', type: 'object', fields: [f('label', 'Libellé', 'string', { validation: required }), f('href', 'Destination', 'url', { validation: safeUrl })], preview: { select: { title: 'label', subtitle: 'href' } } }),
  defineType({ name: 'showroom', title: 'Showroom', type: 'object', fields: [
    f('city', 'Ville', 'string', { validation: required }), f('address', 'Adresse', 'text', { rows: 2 }),
    f('phoneLabel', 'Téléphone affiché'), f('phoneHref', 'Lien téléphone'), f('email', 'Email', 'email'), f('hours', 'Horaires'),
    f('mapHref', 'Lien Google Maps', 'url', { validation: safeUrl }), f('mapEmbed', 'Carte Google Maps intégrée', 'url', { validation: safeUrl }),
    f('wazeHref', 'Lien Waze', 'url', { validation: safeUrl }), f('appleHref', 'Lien Apple Maps', 'url', { validation: safeUrl })
  ], preview: { select: { title: 'city', subtitle: 'address' } } }),
  defineType({ name: 'clientGroup', title: 'Groupe de références', type: 'object', fields: [f('eyebrow', 'Surtitre'), f('title', 'Titre'), array('logos', 'Logos (ajouter ou réordonner)', 'managedImage')], preview: { select: { title: 'title' } } }),
  defineType({ name: 'siteSettings', title: 'Navigation et coordonnées', type: 'document', groups: [{ name: 'identity', title: 'Identité' }, { name: 'navigation', title: 'Menus' }, { name: 'contact', title: 'Contact et showrooms' }, { name: 'form', title: 'Formulaire de contact' }], fields: [
    f('title', 'Nom du site', 'string', { group: 'identity' }), imageField('logo', 'Logo principal', { group: 'identity' }), imageField('footerLogo', 'Logo pied de page', { group: 'identity' }), imageField('contractLogo', 'Logo Contract', { group: 'identity' }),
    array('navigation', 'Menu principal', 'navigationLink', { group: 'navigation' }), array('contractNavigation', 'Menu Contract', 'navigationLink', { group: 'navigation' }), f('contactCta', 'Bouton de contact', 'string', { group: 'navigation' }),
    f('email', 'Email public', 'email', { group: 'contact' }), f('phone', 'Téléphone public', 'string', { group: 'contact' }),
    f('contactTitle', 'Titre du formulaire', 'string', { group: 'form' }), f('contactIntro', 'Introduction du formulaire', 'text', { group: 'form' }),
    f('contactSubmitLabel', 'Texte du bouton d’envoi', 'string', { group: 'form', initialValue: 'Envoyer', validation: rule => rule.max(80) }),
    array('contactFields', 'Champs du formulaire (ajouter, supprimer ou réordonner)', 'contactFormField', {
      group: 'form', initialValue: DEFAULT_CONTACT_FIELDS, options: { disableActions: ['duplicate'] },
      description: 'Publiez pour appliquer les changements au site. Les champs facultatifs peuvent rester vides. Le champ Secteur initial reste affiché uniquement pour les projets professionnels tant que le choix correspondant existe dans Sujet.',
      validation: rule => rule.required().min(1).max(20).custom(value => { try { normalizeContactFields(value); return true; } catch (error) { return error.message; } })
    }),
    array('showrooms', 'Showrooms (ordre du site)', 'showroom', { group: 'contact' }),
    array('socialLinks', 'Réseaux sociaux', 'navigationLink', { group: 'contact' })
  ], preview: { prepare: () => ({ title: 'Navigation, identité et coordonnées' }) } }),
  defineType({ name: 'sitePage', title: 'Page', type: 'document', groups: [{ name: 'content', title: 'Textes' }, { name: 'media', title: 'Images et vidéos' }, { name: 'layout', title: 'Sections et liens' }, { name: 'seo', title: 'SEO' }], fields: [
    f('title', 'Nom de la page', 'string', { validation: required, group: 'content' }),
    f('path', 'Adresse de la page', 'string', { group: 'seo', readOnly: ({ document }) => Boolean(document?.legacyPage), validation: rule => rule.required().regex(/^\/(?:[a-z0-9-]+\/)*$/), description: 'Les adresses des pages existantes sont conservées pour le référencement.' }),
    f('legacyPage', 'Page existante', 'boolean', { hidden: true }), f('template', 'Présentation', 'string', { hidden: true }),
    array('texts', 'Textes de la page', 'pageText', { group: 'content', options: { sortable: false, disableActions: ['add', 'remove', 'duplicate'] }, hidden: ({ document }) => !document?.legacyPage }), array('media', 'Images et vidéos', 'pageMedia', { group: 'media', options: { sortable: false, disableActions: ['add', 'remove', 'duplicate'] } }), array('links', 'Liens et boutons', 'pageLink', { group: 'layout', options: { sortable: false, disableActions: ['add', 'remove', 'duplicate'] } }),
    array('gallery', 'Galerie (ajouter, supprimer ou réordonner)', 'managedImage', { group: 'media', hidden: ({ document }) => !['ambiances', 'mood-boards', 'press-book'].includes(document?.template) }),
    array('sections', 'Sections (ajouter, supprimer ou réordonner)', 'splitSection', { group: 'layout', hidden: ({ document }) => !['contract', 'generic', 'projects'].includes(document?.template) }),
    array('clientGroups', 'Références clients (ajouter ou réordonner)', 'clientGroup', { group: 'layout', hidden: ({ document }) => document?.template !== 'clients' }),
    array('shortcuts', 'Raccourcis de l’accueil', 'shortcut', { group: 'layout', hidden: ({ document }) => document?.template !== 'home' }),
    f('seo', 'Référencement', 'seo', { group: 'seo' })
  ], initialValue: { template: 'generic', legacyPage: false, texts: [], media: [], links: [], sections: [] }, preview: { select: { title: 'title', subtitle: 'path' } } }),
  defineType({ name: 'brand', title: 'Marque', type: 'document', fields: [
    f('title', 'Nom', 'string', { validation: required }), imageField('logo', 'Logo'), f('href', 'Site de la marque', 'url', { validation: safeUrl }),
    f('order', 'Ordre d’affichage', 'number'), f('visible', 'Afficher parmi les partenaires', 'boolean', { initialValue: true }),
    f('layout', 'Dimensions existantes', 'object', { hidden: true, fields: ['width', 'height', 'basis', 'scale', 'gridWidth', 'gridHeight'].map(name => f(name, name)) })
  ], preview: { select: { title: 'title', media: 'logo.image' } } }),
  defineType({ name: 'collection', title: 'Catégorie', type: 'document', fields: [f('title', 'Titre', 'string', { validation: required }), f('key', 'Identifiant de la catégorie', 'string', { validation: rule => rule.required().regex(/^[a-z0-9-]+$/) }), f('typeLabel', 'Type de produit affiché'), f('order', 'Ordre', 'number'), f('seo', 'Référencement', 'seo')], preview: { select: { title: 'title' } } }),
  defineType({ name: 'product', title: 'Produit', type: 'document', groups: [{ name: 'general', title: 'Présentation' }, { name: 'images', title: 'Photos' }, { name: 'colorways', title: 'Coloris' }, { name: 'seo', title: 'SEO' }], fields: [
    f('legacyId', 'Identifiant conservé', 'string', { readOnly: true, hidden: true }),
    f('title', 'Nom du produit', 'string', { validation: required, group: 'general' }),
    f('slug', 'Adresse de la fiche', 'slug', { group: 'seo', options: { source: 'title', maxLength: 80 }, readOnly: ({ document }) => Boolean(document?.legacyId), validation: rule => rule.required().custom(value => !value?.current || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current) || 'Utilisez des lettres minuscules, des chiffres et des tirets.') }),
    f('brand', 'Marque', 'reference', { to: [{ type: 'brand' }], group: 'general' }),
    f('category', 'Catégorie', 'reference', { to: [{ type: 'collection' }], group: 'general', validation: required }), f('subtype', 'Type / usage', 'string', { group: 'general' }),
    f('description', 'Description et caractéristiques', 'richText', { group: 'general' }), f('visible', 'Afficher sur le site', 'boolean', { group: 'general', initialValue: true }),
    f('unavailable', 'Indisponible', 'boolean', { group: 'general', initialValue: false }), f('order', 'Ordre dans le catalogue', 'number', { group: 'general' }),
    array('images', 'Photos (première = photo principale)', 'managedImage', { group: 'images', validation: rule => rule.min(1).required() }),
    array('colorways', 'Coloris (ajouter ou réordonner)', 'colorway', { group: 'colorways' }), f('seo', 'Référencement', 'seo', { group: 'seo' })
  ], initialValue: { visible: true, unavailable: false }, preview: { select: { title: 'title', subtitle: 'brand.title', media: 'images.0.image' } }, orderings: [{ title: 'Ordre du catalogue', name: 'catalogOrder', by: [{ field: 'order', direction: 'asc' }] }, { title: 'Nom', name: 'name', by: [{ field: 'title', direction: 'asc' }] }] })
];
