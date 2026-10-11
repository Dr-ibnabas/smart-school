# Scripts dev historiques

Cette collection contient des scripts utilitaires créés pendant le développement.
Ils ne sont pas appelés par l'application et la plupart datent de l'ancienne
tentative Firestore. Conservés pour référence — supprimer si plus utilisé.

| Script | Rôle | Encore utile ? |
|---|---|---|
| `create-admin.js` | Crée un admin via Firebase Auth (ancienne archi Firestore) | ❌ Remplacé par `backend/create-admin-mysql.js` |
| `set-admin.js`, `fix-admin.js`, `fix-admin.cjs`, `check.cjs`, `check-admin.ts` | Patches ponctuels pour réparer un admin en base | ⚠️ Seulement en debug |
| `count-firestore.js` | Compte les docs Firestore | ❌ Firestore abandonné |
| `test-quota.cjs` | Test du quota Gemini | ⚠️ Utile pour vérifier la clé API |
| `test-api.ts`, `test-db.ts` | Tests manuels d'endpoints / DB | ⚠️ Remplacer par de vrais tests automatisés (Vitest / Jest) |

Le seul script utile aujourd'hui est `backend/create-admin-mysql.js`,
exécutable via `npm run create-admin` depuis la racine du repo.
