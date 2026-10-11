# Smart School

Plateforme de gestion scolaire : élèves, enseignants, classes, notes,
absences, emplois du temps, bulletins, OCR par IA.

## 🏗️ Architecture

```
NEW_SMART_SCHOOL/
├── backend/          Express + MySQL + JWT + Zod + Genkit (Gemini)
│   ├── src/
│   │   ├── config.ts          ← validation env, JWT_SECRET strict en prod
│   │   ├── db.ts              ← pool MySQL
│   │   ├── index.ts           ← app Express, CORS, /uploads, OCR
│   │   ├── routes.ts          ← auth, classes, subjects, students
│   │   ├── routes-*.ts        ← grades, users, absences, bulletins, …
│   │   ├── middlewares/       ← verifyToken, requireRole, validateBody
│   │   ├── schemas.ts         ← schémas Zod
│   │   └── utils/             ← logger, reply
│   ├── database/init.sql      ← schéma MySQL
│   ├── create-admin-mysql.js  ← script d'initialisation admin
│   └── _scripts/              ← scripts dev/historiques (archives)
│
├── frontend/         React 18 + Vite + TypeScript + Tailwind 4
│   ├── src/
│   │   ├── App.tsx            ← routes & gardes (ProtectedRoute)
│   │   ├── main.tsx           ← bootstrap + ErrorBoundary + Toaster
│   │   ├── context/           ← AuthContext (JWT en localStorage)
│   │   ├── hooks/             ← useSettings (branding école)
│   │   ├── services/api.ts    ← UNIQUE source de BACKEND_URL
│   │   ├── components/        ← Layout, Navbar, Sidebar, ErrorBoundary
│   │   ├── pages/             ← Login, Dashboard, Eleves, Bulletins, …
│   │   └── utils/             ← notify (toast), normalize (ids)
│   └── vite.config.ts         ← proxy /api → localhost:3001 en dev
│
├── _archive/         Code Firestore historique (référence uniquement)
│
├── vercel.json       Config Vercel (frontend statique seul)
└── package.json      Scripts agrégés (dev:backend, dev:frontend, …)
```

## ▶️ Démarrage en local

### Prérequis
- **Node 18+**
- **MySQL** (WAMP / XAMPP / installation native) avec une base `smartschool_db`
- Une clé API **Google Gemini** : https://aistudio.google.com/apikey

### 1. Installer les dépendances

```bash
npm run install:all
```

### 2. Configurer le backend

```bash
cp backend/.env.example backend/.env
# Édite backend/.env :
#   DB_PASSWORD=...                       (ton mot de passe MySQL)
#   JWT_SECRET=...                        (généré ci-dessous)
#   GOOGLE_GENAI_API_KEY=...              (clé Gemini)
#   CORS_ORIGINS=http://localhost:3000    (déjà bon en dev)

# Générer un JWT_SECRET sûr :
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Initialiser la base + créer l'admin

```bash
# Dans phpMyAdmin (http://localhost/phpmyadmin) :
#   → Importer backend/database/init.sql

# Créer / réinitialiser l'admin par défaut :
npm run create-admin
#   Matricule : ADMIN-001
#   Mot de passe : admin123
```

### 4. Lancer

```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend

# Ouvrir http://localhost:3000
```

## 🚀 Déploiement

### Frontend → Vercel

```bash
# Connecter le repo à Vercel — vercel.json fait le reste.
# Définir la variable d'env :
#   VITE_API_URL = https://<url-backend>
```

### Backend → Render / Railway / VPS

Cibler Node 18+, exécuter `npm run build --prefix backend && npm start --prefix backend`.

Variables d'env requises (cf. `backend/.env.example`) :
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (64+ caractères, **obligatoire en prod**)
- `GOOGLE_GENAI_API_KEY`
- `CORS_ORIGINS` (ex. `https://smartschool.vercel.app`)
- `NODE_ENV=production`

Le serveur **refuse de démarrer** en production si `JWT_SECRET` est manquant ou faible.

## 🔐 Sécurité

- JWT en `Authorization: Bearer <token>`, expirent en 24 h
- `bcrypt` (10 rounds) pour les mots de passe
- Rate-limit anti-bruteforce sur `/auth/login` (5 essais / 15 min / IP)
- CORS whitelist stricte (pas de `*`)
- Validation Zod systématique sur les bodies critiques
- `requireRole('admin')` sur toutes les routes d'écriture utilisateurs/classes/élèves
- `/uploads/settings` public (logo école), autres sous-dossiers refusés

## 📋 Statut des lots (audit & remédiation)

| Lot | Contenu | Commit |
|---|---|---|
| A | Architecture nettoyée (Firestore archivé, vercel.json, env.example…) | `57674d1` |
| B | Sécurité critique (CORS, rate-limit, /uploads, JWT guard, init-admin retiré) | `57674d1` |
| C | Stabilité (Login fix, ErrorBoundary, validation Zod, roles) | `fdfef11` |
| D | UX & perfs (Toaster, code-split −65 %, PDF parallèle, pagination) | `b356ee4` |
| E | Hygiène (scripts archivés, logger structuré, README) | — |

## 📜 Scripts npm racine

```bash
npm run install:all     # Installe backend + frontend
npm run dev:backend     # Backend en watch sur :3001
npm run dev:frontend    # Frontend Vite sur :3000
npm run build:frontend  # Build prod du frontend
npm run create-admin    # Crée/réinitialise l'admin par défaut
```
