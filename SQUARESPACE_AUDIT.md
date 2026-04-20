# Audit de dépendance Squarespace

Date: 2026-04-05

## Résumé

- Les images récupérées depuis le site officiel ont été rapatriées dans le repo.
- Dossier local: `public/mirrored-assets`
- Volume actuel: `64` fichiers, environ `18 MB`
- Références d'images externes restantes dans le code: `0`

Le site n'est donc plus dépendant de Squarespace pour les images. La zone `produits` est maintenant largement autonomisée côté données, runtime, styles et panier local. En revanche, le site reste encore dépendant de Squarespace pour les shells HTML clonés, plusieurs pages statiques, et le footer/newsletter hérités.

## Dépendances restantes

### 1. Runtime Squarespace chargé dans les pages clonées

Impact: élevé

Constat:
- `29` fichiers chargent encore des scripts ou styles depuis `assets.squarespace.com` ou `static1.squarespace.com`
- `29` fichiers embarquent encore `SQUARESPACE_CONTEXT`
- la zone `produits` ne charge plus de scripts JS Squarespace au runtime
- les pages `produits` gardent encore des CSS externes Squarespace pour préserver le rendu exact

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

Etat actuel de la zone `produits`:
- scripts JS Squarespace supprimés des pages catalogue et fiches
- `site-bundle` Squarespace supprimé
- `SQUARESPACE_CONTEXT` et bootstrap JS supprimés
- CSS Squarespace et `sqspcdn` maintenant mirrorrés localement
- aucune feuille de style distante Squarespace encore chargée au runtime sur `produits`

### 2. Commerce encore partiellement non local

Impact: élevé

Fichiers principaux:
- `src/home-navbar.js`
- `vite.config.js`
- `cart/index.html`
- `panier/index.html`
- `src/cart-store.js`

Constat:
- le panier est maintenant local:
  - stockage `localStorage`
  - compteur local
  - page `/cart` locale
  - ajout au panier local depuis les fiches produit
- le proxy Vite ne sert plus `/cart` ni `/checkout`
- le checkout n'est pas encore réimplémenté en local
- quelques pages hors zone produit gardent encore une icône panier et du markup Squarespace autour du compteur

Effets:
- le panier ne dépend plus du domaine `www.odyssee.ma`
- le checkout final reste à concevoir
- les pages statiques gardent encore du bruit Squarespace autour du panier visuel

### 3. Catalogue produit encore couplé au DOM Squarespace

Impact: faible à moyen

Fichier principal:
- `src/home-navbar.js`

Constat:
- la grille `Produits` est maintenant pilotée par notre couche custom
- les données produit viennent maintenant d'une source locale:
  - `src/product-catalog-data.js`
- le HTML Squarespace sert encore de shell visuel, mais plus de source de vérité produit

Effets:
- la structure DOM reste encore héritée de Squarespace
- un resync HTML peut encore réintroduire du bruit inutile si on ne refait pas le shell plus tard

### 4. Fiches produit encore 100% Squarespace

Impact: moyen

Exemples:
- `produits/p/1830-col-01/index.html`
- `produits/p/1830-col-01-d79r9/index.html`
- `produits/p/at192-col-16/index.html`

Constat:
- ces pages restent des exports Squarespace comme base HTML
- mais leur runtime produit est maintenant local:
  - données locales
  - galerie locale
  - quantité locale
  - rendu produit local
  - ajout au panier local
- elles gardent encore:
  - shell HTML Squarespace
  - footer/newsletter Squarespace
  - classes et structure CSS héritées de Squarespace, mais servies localement

Effets:
- dette technique réduite côté produit
- dépendance restante surtout structurelle et commerce
- la suppression complète passera par un shell HTML/CSS local puis par le remplacement du commerce

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
- La source de vérité du catalogue produit est locale.
- Les fiches produit `/produits/p/...` n'utilisent plus `ProductDetail` au runtime.
- La zone `produits` ne charge plus de scripts JS Squarespace au runtime.
- La zone `produits` ne charge plus non plus de feuilles de style distantes Squarespace au runtime.
- Le panier `/cart` ne passe plus par Squarespace.
- Le proxy Vite ne route plus `/cart` ni `/checkout` vers `odyssee.ma`.

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

Objectif: terminer le flux commerce local

- remplacer le checkout par une étape locale ou un connecteur externe
- nettoyer les restes visuels panier Squarespace dans les pages statiques
- retirer les helpers commerce morts éventuels

Résultat:
- plus de dépendance runtime à Squarespace pour le parcours achat

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
3. Finaliser le checkout local ou sa future intégration externe
4. Réécrire les pages statiques une par une

Si on suit cet ordre, on retire d'abord la partie la plus fragile, sans casser l'apparence du site.
