# Odyssée — gestion des contenus avec Sanity

## Accès et utilisation

Studio : https://www.odyssee.ma/admin/ (ancien backoffice remplacé).

Le projet Sanity `odyssee-cms` (`ve9xrq77`, dataset public `production`) est rattaché au compte Vercel du propriétaire. Le GitHub JarvisMidoria est administrateur du projet : choisir GitHub sur l’écran de connexion du Studio. Son compte Sanity existant a reçu cet accès après autorisation du propriétaire ; le compte créé par Vercel est conservé pour la gestion de l’intégration. Une liaison directe des méthodes a été refusée par Sanity car GitHub était déjà associé à ce compte existant. Aucun compte n’a été supprimé.

Pour l’agence : inviter son adresse dans les membres du projet Sanity, avec le rôle Administrator si elle doit tout gérer sur Free. Aucun accès GitHub, Render, Vercel ni mot de passe du propriétaire n’est nécessaire pour modifier les contenus. Les invitations restent à faire lorsque les adresses de l’agence seront fournies. Le dataset contient uniquement des contenus publics : ne pas y ajouter de messages clients, comptes ou autres données confidentielles.

1. Ouvrir Pages du site, Produits et coloris, Catégories, Marques ou Navigation, logos et coordonnées.
2. Modifier le texte, importer une image/vidéo, renseigner son texte alternatif, ajuster les liens ou l’ordre.
3. Utiliser Prévisualiser pour une page ou un produit. Le brouillon reste privé ; les pages publiques ne le chargent pas.
4. Cliquer Publier. Le webhook déclenche une reconstruction Vercel. La nouvelle version devient visible après la réussite du déploiement, généralement en quelques minutes. Une erreur de construction conserve le précédent site publié.

Les mises en page actuelles sont conservées. Les champs des pages existantes permettent de modifier leurs contenus sans déplacer librement tous les blocs. Les galeries, coloris, produits, marques, catégories, références clients et sections Contract/Projets peuvent être ajoutés, supprimés ou réordonnés. De nouvelles pages peuvent être créées avec des sections texte/image et ajoutées au menu. Les adresses des pages et produits historiques restent verrouillées pour préserver les liens et favoris.

## Source et déploiement

- Dépôt : JarvisMidoria/ODC, branche `codex/sanity-cms`.
- Vercel : `jarvismidorias-projects/odc-preview`, projet `prj_Bt0AZqm8lM9txr3suR2YgsgLYBgq`.
- Production : https://www.odyssee.ma et https://odyssee.ma.
- Origine de test Studio : https://odc-preview-jarvismidorias-projects.vercel.app.
- CORS Sanity avec credentials : ces trois origines exactes et http://localhost:3333. Aucun wildcard nécessaire.
- Webhook Sanity « Publication du site Odyssée », dataset production, create/update/delete sur siteSettings/sitePage/product/brand/collection, sans drafts ni versions. Payload réduit à l’ID et au type. L’URL Vercel est un secret, conservé hors Git dans tmp/sanity-secrets/deploy-hook.json.
- Chaque build exécute sync:cms : données publiées uniquement, import des images depuis le CDN Sanity, génération des fiches et pages, HTML initial/SEO/sitemap. Une erreur CMS bloque le nouveau build au lieu de publier silencieusement un catalogue ancien ou incomplet.
- Les variables SANITY_API_READ_TOKEN et SANITY_API_WRITE_TOKEN restent exclusivement serveur. Les VITE_SANITY_PROJECT_ID et VITE_SANITY_DATASET sont des identifiants publics.
- Pour synchroniser localement sans exposer les secrets : `node --env-file=tmp/sanity-secrets/.env.local scripts/sync-sanity.mjs`, puis les deux scripts generate-imported-product-pages.mjs et generate-cms-pages.mjs, puis `npx vite build`.
- Contrôles : `node --test tests/*.test.mjs` ; parcours navigateur catalogue/favoris/contact ; vérification de prévisualisation des brouillons et de publication réelle.

## Import, sauvegarde et retour arrière

Import initial : 100 produits, 1 070 coloris et 11 pages, avec les identifiants historiques conservés. 1 869 URL de médias ont été résolues en 1 851 assets Sanity dédupliqués. Quatre WebP sources invalides/inaccessibles utilisent leur JPEG correspondant déjà importé ; les URL originales restent conservées dans les documents. Les autres URL originales sont aussi conservées en repli.

L’import initial utilise createIfNotExists et n’écrase pas les modifications de l’équipe. Ne pas réinitialiser le dataset. Les snapshots de contenu publiés du dépôt ne contiennent ni jeton ni brouillon.

Sauvegardes privées ignorées par Git/Vercel :

- data/archives/sanity-before-import/ : état du dataset avant import.
- data/archives/sanity-2026-10-15T16-13-58-835Z/ : 1 989 documents, inventaire de 1 851 assets et empreinte SHA-256. Les binaires médias restent dans Sanity ; cet export seul n’est pas une archive média indépendante.
- Pour un nouvel export de contenu : `node --env-file=tmp/sanity-secrets/.env.local scripts/export-sanity.mjs`.
- Pour une archive indépendante avec médias : utiliser la commande officielle `sanity dataset export production` avec assets et une authentification privée, puis conserver une seconde copie sécurisée.
- Retour arrière Vercel avant Sanity : dpl_6bdKAvoDQVZPuAis4j9b8ZpWVqyK. Un rollback peut suspendre l’affectation automatique des domaines : vérifier puis promouvoir explicitement le prochain déploiement validé.

Render et son disque restent préservés. Le site public, les favoris et le formulaire ne dépendent plus de Render. L’ancienne base de production reste à récupérer avant toute suppression, comme indiqué dans AUTH_DEPLOY.md ; l’archive locale historique ne remplace pas cette récupération.

## Coût et fonctionnement conservé

Sanity a été provisionné avec l’offre Free (0 $). Le tableau de bord a activé un essai Growth gratuit de 30 jours et indique explicitement un retour automatique à Free à son terme. Aucun abonnement payant n’a été ajouté et aucune fonction payante n’est requise par ce Studio. Les quotas Free s’appliquent ; ne pas cliquer Upgrade sans décision du propriétaire.

Vercel conserve son abonnement existant. Le formulaire continue de fonctionner via une fonction Vercel et Brevo, avec le même test mensuel et la même surveillance quotidienne Codex. Les destinataires réels du formulaire sont une configuration serveur, distincte de l’adresse publique modifiable dans le CMS. Les favoris restent dans le navigateur et n’exigent aucun compte visiteur.

## Vérifications de mise en service du 15 octobre 2026

- Version Sanity initiale validée puis promue : dpl_nXcXtFago5G1zieawoco9CcraKMs, commit e1b4f7f.
- Branche de production Vercel confirmée : codex/sanity-cms ; affectation automatique des domaines activée.
- Publication depuis le Studio avec GitHub : ajout de l’image de partage SEO de Histoire, en réutilisant sa photo existante. Sanity a reçu HTTP 201 du hook Vercel et lancé le déploiement de production dpl_FammMTwDrb1p6mYNmfZHGykA6FkG. Déploiement READY et image og:image effectivement présente dans le HTML public de /histoire/. Aucun texte visible de test n’a été publié.
- Contrôle après promotion : SMTP vérifié par HEAD sans envoi, cron mensuel actif, aucune erreur du moniteur, preuve du test réel initial conservée.
