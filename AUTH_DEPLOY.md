# Odyssée — catalogue public et retrait progressif de Render

## Fonctionnement de la nouvelle version

- Les fiches, coloris et modales produit sont publics. Il n'y a plus de compte visiteur.
- Les favoris sont stockés dans `localStorage`, avec la clé historique `odc-favorites-v1`, par produit et coloris. Ils persistent dans ce navigateur et se synchronisent entre ses onglets. Ils ne se synchronisent pas entre appareils et peuvent disparaître si le stockage du site est effacé. Si le navigateur refuse le stockage, la sélection reste utilisable pendant la visite.
- `POST /api/contact` est une fonction Node Vercel autonome. Elle transmet le message à la boîte de contact par le relais SMTP Brevo en TLS. Elle ne stocke pas de nouvelle base clients ni de boîte de réception dans Render.
- Les anciens écrans d'administration affichent une notice. Les anciennes sources serveur sont conservées pour l'archivage et le retour arrière, mais exclues des déploiements Vercel.
- Les disponibilités sont chargées depuis `public/catalog-statuses.json`. Le fichier livré pour la préversion indique explicitement que les disponibilités de production n'ont pas encore été exportées. La production utilisait déjà les valeurs du catalogue en repli, puisque l'API Render renvoyait HTTP 503. Le nouvel affichage conserve ce repli. Il faudra récupérer et réintégrer les anciens ajustements de disponibilité à partir de l'archive avant toute suppression du disque Render.

## Configuration du formulaire

Variables **serveur uniquement**, jamais préfixées par `VITE_` :

- `BREVO_SMTP_USER` : identifiant SMTP indiqué par Brevo.
- `BREVO_SMTP_PASSWORD` : clé dédiée « Odyssee - formulaire contact Vercel », stockée comme secret Vercel.
- `MAIL_FROM` : expéditeur Brevo déjà validé (`noreply@odyssee.ma` dans la configuration initiale).
- `CONTACT_NOTIFICATION_TO=contact@odyssee.ma`.
- `CONTACT_SITE_ORIGIN` : origine supplémentaire exacte, facultative. Les domaines Odyssée et l'URL propre au déploiement Vercel sont autorisés automatiquement.
- `CONTACT_VERIFY_ONLY=1` : **uniquement en préversion ou en local**. Le formulaire valide les champs et vérifie l'authentification SMTP, sans soumettre de message. Son texte de succès précise qu'aucun email n'a été envoyé. Cette variable doit être absente en production ; le serveur refuse d'annoncer un succès si elle est activée en production.

La clé SMTP est dédiée au formulaire et sans expiration programmée, à la demande du propriétaire. Brevo peut cependant désactiver une clé après 90 jours sans envoi réussi. Un test mensuel utilise désormais cette même clé (voir ci-dessous). La clé de l'ancienne API et le filtrage IP de cette API ne sont pas utilisés par le nouveau formulaire. Aucun réglage de filtrage IP Brevo n'a été désactivé.

### Test automatique mensuel et surveillance

- Cron Vercel : `/api/contact-monthly-test`, `0 8 1 * *` (1er de chaque mois, 08:00 UTC ; fenêtre Hobby jusqu'à 09:00 UTC). Prochain passage prévu : 1er novembre 2026.
- `CRON_SECRET` est un secret serveur de production, aléatoire sur 256 bits. Vercel transmet automatiquement l'autorisation Bearer ; la route refuse tout appel non authentifié. Ne jamais placer ce secret dans une URL ou dans le navigateur.
- GET en production envoie à `CONTACT_NOTIFICATION_TO` le sujet `[Odyssée] Test automatique mensuel du formulaire`, via le même module SMTP et la même clé que le formulaire. Aucun destinataire ni contenu n'est fourni par l'appelant. Préversion et configuration de vérification seule refusent tout envoi.
- HEAD authentifié vérifie seulement la connexion SMTP et renvoie 204 ; il ne soumet aucun email. Le contrôle quotidien peut donc fonctionner sans ajouter des emails aux 12 tests annuels prévus. Les déclenchements manuels et une éventuelle duplication par Vercel peuvent ajouter un message ; aucune base n'est ajoutée pour dédupliquer un email de test.
- Logs fixes : `CONTACT_MONTHLY_TEST_ACCEPTED` ou `CONTACT_MONTHLY_TEST_FAILED`. L'acceptation SMTP ne prouve pas la réception dans la boîte finale. Aucun secret ni contenu de demande client dans ces logs.
- Premier envoi réel validé le 15 octobre 2026 à 15:01:34 UTC : HTTP 200, destinataire accepté par SMTP, événement `Sent` visible dans Brevo. Ce test d'installation s'ajoute au calendrier mensuel. La réception dans la boîte finale n'a pas été vérifiée.
- Déploiement actif du cron : `dpl_6bdKAvoDQVZPuAis4j9b8ZpWVqyK`, source `50a49f8`. Déploiement précédent sans cron : `dpl_AQ8uGqrKzsABLgMiAD3Ajoqfjkwc`.
- À la demande du propriétaire, surveillance Codex dans ce chat chaque jour à 11h, identifiant `surveiller-le-formulaire-odyss-e`. Elle exécute `node scripts/monitor-contact-cron.mjs` : HEAD sans envoi, contrôle de la configuration du cron et lecture des traces récentes. L'état privé local est `.runlogs/contact-cron-monitor.json`. Le secret local utilisé pour HEAD reste dans `tmp/contact-secrets/CRON_SECRET` (ignoré Git et Vercel).
- Les logs Hobby ne sont conservés qu'une heure : si la trace du mois manque, la surveillance doit consulter les journaux transactionnels Brevo, puis enregistrer seulement une preuve réelle avec `node scripts/monitor-contact-cron.mjs --record-success <date ISO>`. Un contrôle inaccessible ou un résultat manquant produit une alerte d'incertitude, jamais un succès supposé. Ne pas relancer GET automatiquement pour vérifier.
- Les alertes dans ce chat dépendent du Mac allumé, de Codex ouvert et des sessions de connexion valides. Le cron d'envoi reste hébergé sur Vercel et indépendant du Mac. Les alertes natives avancées Vercel ne sont pas incluses dans Hobby ; aucun service de surveillance externe ni abonnement payant n'a été ajouté.
- Premier contrôle quotidien exécuté : connexion vérifiée sans email, cron actif et calendrier conforme, aucune erreur, preuve du test d'installation enregistrée. Tests automatisés de refus d'accès, d'environnement et d'échec SMTP réussis. Aucun email d'alerte Brevo n'est utilisé.

L'envoi est attendu avant la réponse HTTP. Le serveur ne renvoie le succès qu'après acceptation du destinataire par le relais SMTP. En cas d'erreur ou de délai dépassé, le formulaire conserve le message et propose l'adresse de contact. Les logs n'incluent ni identifiants SMTP ni contenu des messages. La limite de requêtes en mémoire est une protection par instance, pas une limite globale garantie entre toutes les fonctions Vercel.

Pour travailler localement, copier `.env.example` vers `.env.local`, renseigner les identifiants côté serveur et lancer `npm run dev`. Le middleware de développement utilise exactement la même fonction que Vercel. Il n'y a plus de proxy de l'API vers Render.

## Sauvegarder les anciennes données avant toute suppression de Render

**Ne pas supprimer le service Render, son disque, ses clés ou sa base à ce stade.** Le service est suspendu pour impayés et son shell n'est pas accessible. La copie locale n'est pas une sauvegarde de production. Sept snapshots du disque étaient visibles le 15 octobre 2026, dont un du jour, mais ils n'ont pas été exportés.

Une copie locale cohérente de l'ancienne base est conservée dans `data/archives/local-before-public-catalog-verified/`. Elle inclut les 14 tables présentes localement. Son inventaire et son empreinte sont dans `manifest.json`. Elle ne prouve pas que les derniers clients ou messages de production sont récupérés.

Après rétablissement de l'accès au **service ordinaire avec son disque**, faire une sauvegarde SQLite en ligne. Ne pas utiliser un shell éphémère sans disque et ne pas simplement copier le fichier `.sqlite` d'une base en WAL en oubliant ses fichiers associés.

Exemple à exécuter dans le shell du service existant, depuis son répertoire de projet :

```sh
node --input-type=module <<'JS'
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { chmodSync } from 'node:fs';
const source = resolve(process.env.ODC_DB_PATH || resolve(process.cwd(), 'data', 'odc.sqlite'));
const db = new Database(source, { readonly: true, fileMustExist: true });
await db.backup('/tmp/odc-production-backup.sqlite');
db.close();
const copy = new Database('/tmp/odc-production-backup.sqlite', { fileMustExist: true });
copy.pragma('journal_mode = DELETE');
const integrity = copy.pragma('integrity_check', { simple: true });
copy.close();
chmodSync('/tmp/odc-production-backup.sqlite', 0o600);
if (integrity !== 'ok') throw new Error('Archive SQLite à vérifier');
console.log('Archive cohérente créée, sans modification de la base source.');
JS
```

Télécharger ensuite ce fichier via l'accès SSH/SCP documenté dans le tableau de bord Render vers un dossier privé ignoré par Git, puis produire l'archive finale :

```sh
python3 scripts/archive-legacy-data.py \
  --database data/odc-production-backup.sqlite \
  --output data/archives/render-production-final \
  --source render-production
```

L'outil n'écrit pas dans la source et refuse d'écraser un dossier d'archive existant. Il crée :

- `legacy.sqlite`, copie autonome avec toutes les tables, y compris les anciennes tables non utilisées par le site actuel, leurs identifiants, mots de passe hachés, favoris et messages ;
- `manifest.json`, avec inventaire des tables, colonnes, volumes, résultat du contrôle d'intégrité et empreinte SHA-256 ;
- `catalog-statuses.json`, contenant uniquement les disponibilités publiques, sans comptes ni messages.

Les archives sont privées (dossier 0700, fichiers 0600), ignorées par Git et exclues de Vercel. Seul le fichier de disponibilités peut être copié vers `public/catalog-statuses.json`, **après vérification que sa source est bien `render-production`**. Conserver une seconde copie sécurisée de l'archive complète et vérifier la restauration et les volumes avant de supprimer quoi que ce soit chez Render.

## Vérification et bascule

1. Confirmer le projet Vercel `jarvismidorias-projects/odc-preview`, ses alias `odyssee.ma` et `www.odyssee.ma`, et l'abonnement approprié. Le compte inspecté le 15 octobre 2026 était en Hobby ; aucun abonnement payant n'a été souscrit.
2. Tester la préversion : catalogue, filtres, modales, fiches directes, coloris, favoris après rechargement et entre onglets, sur ordinateur et mobile.
3. Vérifier l'authentification SMTP depuis la préversion avec `CONTACT_VERIFY_ONLY=1` ; ne pas confondre cette vérification avec un email réellement livré.
4. Pour la production, configurer les mêmes identifiants SMTP serveur et retirer `CONTACT_VERIFY_ONLY`. Vérifier l'expéditeur et le destinataire. Un essai de livraison réelle nécessite l'accord explicite du propriétaire pour envoyer ce message.
5. Importer les disponibilités de production avant la bascule. Conserver le déploiement Vercel actuel comme retour arrière. Déployer d'abord en préversion ; ne pas promouvoir une version dont le contact n'est pas configuré.
6. Une fois la nouvelle version validée et les anciennes données archivées en deux copies, décider séparément de la suppression Render. Aucune commande de suppression n'est fournie ni exécutée automatiquement.

Commandes de vérification :

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
npm run build
```

Le retrait des comptes et du serveur Render n'efface pas les factures impayées de l'ancien workspace.

## État de livraison au 15 octobre 2026

- Branche source : `codex/public-catalog-local-favorites` ; l'ancienne branche Render est conservée.
- Préversion vérifiée : `https://odc-preview-65ydmtmof-jarvismidorias-projects.vercel.app`.
- Nouvelle version promue sur `https://www.odyssee.ma` et `https://odyssee.ma` : déploiement `dpl_AQ8uGqrKzsABLgMiAD3Ajoqfjkwc`.
- Retour arrière Vercel disponible : `dpl_Gq9kcAkx9bPZrX5MpwBftRf3dxEf`.
- Identifiants SMTP configurés en production et en préversion. `CONTACT_VERIFY_ONLY` est activé uniquement en préversion et absent en production.
- Connexion SMTP Brevo vérifiée depuis Vercel avec HTTP 200, sans aucun email réel envoyé. Le domaine `odyssee.ma` est indiqué Authenticated dans Brevo.
- Parcours catalogue et favoris testés dans le navigateur, sur ordinateur et mobile. Le formulaire refuse correctement les soumissions vides ; les échecs n'effacent pas le texte saisi.
- Render et son disque n'ont pas été supprimés. L'archive de production reste à récupérer après rétablissement de l'accès. Seule la copie locale est déjà archivée et vérifiée.
- Aucun abonnement Vercel ou Render n'a été souscrit ou modifié. Le point de régularisation commerciale de Vercel Hobby reste à traiter par le propriétaire.
