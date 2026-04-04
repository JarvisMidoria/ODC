# Audit de dépendance Squarespace

Date: 2026-04-04

## Résumé

- Les images récupérées depuis le site officiel ont été rapatriées dans le repo.
- Dossier local: `public/mirrored-assets`
- Volume actuel: `64` fichiers, environ `18 MB`
- Références d'images externes restantes dans le code: `0`

Le site n'est donc plus dépendant de Squarespace pour les images. En revanche, il reste encore fortement dépendant de Squarespace pour le HTML cloné, les scripts runtime, le commerce, et la structure DOM.

## Dépendances restantes

### 1. Runtime Squarespace chargé dans les pages clonées

Impact: élevé

Constat:
- `29` fichiers chargent encore des scripts ou styles depuis `assets.squarespace.com` ou `static1.squarespace.com`
- `29` fichiers embarquent encore `SQUARESPACE_CONTEXT`

Exemples:
- `index.html`
- `home/index.html`
- `produits.html`
- `produits/index.html`
- `produits/p/*/index.html`
- `marques.html`
- `ambiances.html`
- `contract.html`
- `histoire.html`
- `showrooms.html`

Effets:
- Poids de page inutilement élevé
- Risque de comportement parasite si Squarespace change son runtime
- Build Vite bruyant à cause du HTML invalide exporté tel quel depuis Squarespace
- Forte difficulté à contrôler précisément les interactions

### 2. Commerce encore branché sur Squarespace

Impact: élevé

Fichiers principaux:
- `src/home-navbar.js`
- `vite.config.js`
- `cart/index.html`
- `panier/index.html`

Constat:
- le code utilise encore `/cart`, `/checkout`, `/api/commerce/*`
- le dev server proxy encore:
  - `/api`
  - `/assets`
  - `/cart`
  - `/checkout`
  - `/universal`

Effets:
- le panier et le checkout ne sont pas autonomes
- l'expérience produit reste fragile tant que les fiches produit ne sont pas réécrites
- le site local dépend encore du domaine `www.odyssee.ma` pour une partie du flux commerce

### 3. Catalogue produit encore couplé au DOM Squarespace

Impact: moyen à élevé

Fichier principal:
- `src/home-navbar.js`

Constat:
- la grille `Produits` est maintenant pilotée par notre couche custom
- mais elle lit encore les données depuis le HTML Squarespace cloné:
  - `.product-list[data-controller='ProductList']`
  - `data-context`

Effets:
- si le markup source change, notre couche peut casser
- les données produit ne sont pas encore dans une source canonique locale

### 4. Fiches produit encore 100% Squarespace

Impact: élevé

Exemples:
- `produits/p/1830-col-01/index.html`
- `produits/p/1830-col-01-d79r9/index.html`
- `produits/p/at192-col-16/index.html`

Constat:
- ces pages sont encore des exports Squarespace quasi bruts
- elles incluent encore:
  - `SQUARESPACE_CONTEXT`
  - scripts commerce Squarespace
  - markup galerie Squarespace
  - forms/newsletter/footer Squarespace
  - appels JS du type `Y.use(...)`

Effets:
- très forte dette technique
- difficile de styliser et stabiliser finement
- la vraie suppression de la dépendance produit ne sera complète qu'après réécriture de ces pages

### 5. Pages statiques encore issues d'un sync distant

Impact: moyen

Fichiers:
- `scripts/sync-home.mjs`
- `scripts/sync-pages.mjs`
- `scripts/sync-produits.mjs`

Constat:
- le projet sait encore resynchroniser son HTML depuis `https://www.odyssee.ma`
- ces scripts réinjectent ensuite notre navbar custom dans du HTML Squarespace

Effets:
- bon pour cloner rapidement
- mauvais pour stabiliser un front indépendant
- tout resync peut réintroduire du code Squarespace inutile

### 6. Formulaires et newsletter encore liés au markup Squarespace

Impact: moyen

Constat:
- le footer et certaines pages gardent le markup/form rendering Squarespace
- les handlers hérités sont encore présents dans le HTML exporté

Effets:
- UX dépendante d'un fournisseur externe
- validation et soumission moins maîtrisées

## Ce qui est déjà assaini

- Les images officielles utilisées par le projet ont été rapatriées localement.
- Les logos de marque, visuels home, visuels ambiance, visuels produits et favicon ne dépendent plus du CDN Squarespace.
- La grille `Produits` et la modale catalogue n'utilisent plus le comportement de clic Squarespace.

## Plan recommandé pour retirer Squarespace progressivement

### Phase 1

Objectif: couper la dépendance produit côté listing

- Créer une vraie source de données locale pour les produits
- Alimenter la grille catalogue depuis un JSON local ou `src/data.js`
- Ne plus lire `data-context` dans le HTML Squarespace

Résultat:
- la page `/produits` devient entièrement autonome côté front

### Phase 2

Objectif: remplacer les fiches produit

- Refaire les pages `/produits/p/...` avec un template local
- Réutiliser les images déjà rapatriées
- Garder la même apparence, mais supprimer scripts commerce et galerie Squarespace

Résultat:
- tout le parcours catalogue/fiche produit sort de Squarespace

### Phase 3

Objectif: sortir du commerce Squarespace

- remplacer `/cart` et `/checkout`
- retirer le proxy commerce de `vite.config.js`
- supprimer `ensureCommerceSession`, `patchCommerceRequests`, et le bridge panier dans `src/home-navbar.js`

Résultat:
- plus de dépendance runtime à Squarespace pour l'achat

### Phase 4

Objectif: nettoyer les pages statiques clonées

- réécrire `home`, `marques`, `ambiances`, `contract`, `histoire`, `showrooms` avec des templates locaux
- supprimer les scripts `sync-*`
- enlever les scripts et styles `assets.squarespace.com`

Résultat:
- site entièrement maîtrisé côté code

## Priorité pratique

Ordre conseillé:

1. Figer les données produit localement
2. Refaire les fiches produit
3. Supprimer le proxy commerce
4. Réécrire les pages statiques une par une

Si on suit cet ordre, on retire d'abord la partie la plus fragile, sans casser l'apparence du site.
