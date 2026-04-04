# Audit UX/UI Odyssée

## Constat global

Le site public actuel expose une base de contenu crédible, mais l'expérience est coupée au point d'entrée. La page d'accueil `https://www.odyssee.ma/` renvoie vers un écran de maintenance au lieu de jouer son rôle commercial. Les autres pages restent accessibles, mais elles donnent une impression de site en construction plutôt que de maison premium installée.

## Ce qui marche

- Le territoire de marque est cohérent: textile, décoration, ambiances, marques internationales.
- Les contenus `Histoire`, `Contract`, `Showrooms` et `Contacter` existent déjà et servent une vraie narration business.
- Le catalogue contient des catégories et plusieurs fiches produit avec des informations utiles comme prix, composition et performances.
- Les visuels d'ambiance sont de bonne qualité et portent une perception premium.

## Ce qui ne marche pas

- La page d'accueil publique est en maintenance, ce qui bloque la découverte et fait perdre la première impression.
- L'URL `https://www.odyssee.ma/home` renvoie `401 Unauthorized`, ce qui suggère une structure de navigation incomplète ou mal exposée côté public.
- Le slug `showroons` est une faute visible qui nuit à la crédibilité et au SEO.
- La navigation et le footer se répètent quasiment à l'identique sur chaque page, avec peu de hiérarchie visuelle.
- Le menu affiche `0` plusieurs fois autour du panier sur certaines pages, ce qui pollue la lecture.
- Le catalogue produit manque d'orchestration: filtres, catégories et quick view coexistent sans parcours clair.
- Les fiches produit sont hétérogènes: certaines ont une description détaillée, d'autres très peu d'information.
- Le site donne peu de raisons d'action immédiate: showroom, devis, projet contract et contact ne sont pas suffisamment priorisés.
- La meta description de la home est vide.
- Le balisage social mélange des URLs `http` et `https`, ce qui n'est pas propre pour le partage.

## Opportunités de refonte

- Remettre une vraie homepage éditoriale avec accès direct à `Produits`, `Showrooms`, `Contract` et `Marques`.
- Transformer les ambiances en moteur d'inspiration relié aux collections.
- Faire des showrooms un vrai point de conversion, pas une simple page d'adresse.
- Clarifier l'offre contract avec bénéfices, usages et prise de contact visible.
- Assumer une page produit en mock data temporaire, mais mieux structurée, afin de préparer son remplacement propre plus tard.

## Décision de design pour cette nouvelle version

- Conserver l'univers premium et chaleureux de la marque.
- Renforcer la hiérarchie avec une home forte, des CTA visibles et une structure plus éditoriale.
- Simplifier le catalogue et rendre les catégories immédiatement compréhensibles.
- Préparer une future intégration des vraies fiches produit sans refaire toute l'architecture.
