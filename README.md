# 🚀 Katalog Backend — SaaS Commercial Multi-Tenant

Backend NestJS 11 complet, scalable et sécurisé pour la plateforme SaaS **Katalog** — génération automatique de catalogues produits professionnels pour commerçants.

---

## 📑 Table des Matières
- [Architecture & Stack](#-architecture--stack)
- [Variables d'environnement](#-variables-denvironnement)
- [Installation & Démarrage Rapide](#-installation--démarrage-rapide)
- [Base de données & Seeds](#-base-de-données--seeds)
- [Documentation API (Swagger)](#-documentation-api-swagger)
- [Changement de Fournisseurs (Providers)](#-changement-de-fournisseurs-providers)
  - [Changer de Fournisseur de Paiement](#1-fournisseur-de-paiement)
  - [Changer de Fournisseur IA](#2-fournisseur-ia)
  - [Changer de Fournisseur de Stockage](#3-fournisseur-de-stockage)
  - [Changer de Fournisseur Email](#4-fournisseur-email)
- [Procédure de Déploiement Production](#-procédure-de-déploiement-production)
- [Procédure de Sauvegarde & Backup PostgreSQL](#-procédure-de-sauvegarde--backup-postgresql)
- [Tests](#-tests)

---

## 🏗 Architecture & Stack

- **Framework** : NestJS 11 (TypeScript, ES2022)
- **Base de données** : PostgreSQL 16 + Prisma ORM 6
- **Cache & Queues** : Redis 7 + BullMQ 5
- **Auth & Sécurité** : Passport.js (JWT, Google OAuth 2.0), argon2, otplib (TOTP 2FA admin), Helmet, CORS
- **Traitement Média & PDF** : Sharp (WebP, thumbnails, recadrage), pdf-lib (génération PDF local), qrcode (QR local)
- **Documentation API** : OpenAPI 3.0 / Swagger UI natif

### Structure Modulaire
```
src/
├── admin/          # Panneau d'administration RBAC + 2FA
├── analytics/      # Ingestion d'événements publics avec déduplication Redis (30m)
├── auth/           # Inscription, login, Google OAuth, 2FA TOTP, session
├── catalogues/     # Gestion et publication des catalogues
├── categories/     # Hiérarchie des catégories (globales + par boutique)
├── collections/    # Regroupements produits (pivot product_collections)
├── common/         # Decorators, Guards, Interceptors, Filters, Pagination, i18n
├── config/         # Validation Zod des variables d'environnement
├── health/         # Endpoints /health et /ready (Terminus)
├── images/         # Pipeline de traitement image async (9 étapes BullMQ)
├── integrations/   # Adapters interchangeables (Payment, AI, Storage, Email)
├── notifications/  # Notifications in-app & email
├── pdf/            # Générateur PDF async BullMQ
├── payments/       # Logique paiement, webhooks & réconciliation cron
├── products/       # Gestion produits (avec statuts PENDING_REVIEW modération)
├── public/         # API publique pour la consultation des catalogues (SEO/OpenGraph)
├── qr-codes/       # Génération QR code locale
├── redis/          # Service Redis singleton
├── shops/          # Multi-tenant shops, members, settings, contrôle quotas
├── subscriptions/  # Plans FREE/PREMIUM, contrôle central des quotas (QuotaService)
├── templates/      # Templates de catalogues éditables
└── users/          # Utilisateurs & profils
```

---

## 🔑 Variables d'environnement

Créer un fichier `.env` à la racine à partir de `.env.example` :

```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
API_URL=http://localhost:3000/api
PUBLIC_CATALOG_URL=http://localhost:3000/c

# Base de données & Cache
DATABASE_URL=postgresql://katalog:katalog_dev_password@localhost:5432/katalog?schema=public
REDIS_URL=redis://localhost:6379

# Sécurité
JWT_SECRET=votre-cle-secrete-jwt-64-caracteres
JWT_REFRESH_SECRET=votre-cle-secrete-refresh-jwt-64-caracteres
TWO_FA_ENCRYPTION_KEY=64-hex-chars-key-for-aes-256-gcm-encryption

# Auth Google OAuth
GOOGLE_CLIENT_ID=votre-google-client-id
GOOGLE_CLIENT_SECRET=votre-google-client-secret

# Stockage Objet (Cloudflare R2 / AWS S3)
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=https://votre-account-id.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=votre-access-key
STORAGE_SECRET_KEY=votre-secret-key
STORAGE_BUCKET=katalog-images

# Intelligence Artificielle
AI_PROVIDER=openai
AI_API_KEY=sk-proj-votre-cle-openai

# Paiement (Stripe / CinetPay / NotchPay / PawaPay)
PAYMENT_PROVIDER=cinetpay
CINETPAY_API_KEY=votre-cinetpay-api-key
CINETPAY_SITE_ID=votre-cinetpay-site-id
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Transactionnel
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_votre-cle-resend
```

---

## ⚡ Installation & Démarrage Rapide

### 1. Démarrer les services Docker (PostgreSQL + Redis)
```bash
docker-compose up -d
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Exécuter les migrations et le seed
```bash
npx prisma migrate dev
npx prisma db seed
```

### 4. Lancer le serveur en mode développement
```bash
npm run start:dev
```

Le serveur écoute sur `http://localhost:3000`.

---

## 🗄 Base de données & Seeds

Le script `prisma/seed.ts` initialise :
- Les plans d'abonnement (`FREE` et `PREMIUM`)
- La liste des slugs réservés en base (`reserved_slugs`)
- Les templates de catalogue par défaut
- Le compte Super Admin (`admin@katalog.cm` / `KatalogAdmin2026!`)

Pour réinitialiser complètement la base de données :
```bash
npm run db:reset
```

---

## 📚 Documentation API (Swagger)

L'API OpenAPI est générée automatiquement et accessible à l'adresse :
👉 **`http://localhost:3000/api/docs`**

Toutes les routes disposent de tags, de schémas d'entrée/sortie documentés et d'exemples de requêtes.

---

## 🔄 Changement de Fournisseurs (Providers)

Chaque service externe est isolé derrière une interface injectable via le pattern **Ports & Adapters**. Vous pouvez remplacer un fournisseur en modifiant la variable d'environnement correspondante sans toucher au code applicatif.

### 1. Fournisseur de Paiement
Par défaut, le système supporte **CinetPay**, **Stripe**, **NotchPay** et **PawaPay**.

Pour basculer vers Stripe :
1. Définir `PAYMENT_PROVIDER=stripe` dans `.env`
2. Renseigner `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`
3. Redémarrer le serveur. Le module `PaymentModule` instanciera automatiquement `StripeAdapter`.

Pour ajouter un nouveau fournisseur :
1. Créer une classe dans `src/integrations/payment/adapters/mon-fournisseur.adapter.ts` implémentant `PaymentProviderInterface`
2. Ajouter le cas correspondant dans le factory `payment.module.ts`.

### 2. Fournisseur IA
1. Définir `AI_PROVIDER=openai` (ou `anthropic` / `gemini`)
2. Définir `AI_API_KEY`
3. L'adapter gère l'analyse d'image produit, la détection de bounding box, la modération et la génération de description.

### 3. Fournisseur de Stockage
1. Définir `STORAGE_PROVIDER=s3` (compatible AWS S3 et Cloudflare R2) ou `cloudinary`
2. Renseigner les accès dans `.env` (`STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, etc.)

### 4. Fournisseur Email
1. Définir `EMAIL_PROVIDER=resend` (ou `sendgrid` / `ses`)
2. Renseigner `EMAIL_API_KEY`

---

## 🚢 Procédure de Déploiement Production

### Via Docker Multi-Stage (Recommandé)

1. Builder l'image Docker :
```bash
docker build -t katalog-backend:latest .
```

2. Exécuter le conteneur en passant le fichier d'environnement de production :
```bash
docker run -d \
  --name katalog-api \
  --env-file .env.production \
  -p 3000:3000 \
  katalog-backend:latest
```

3. Exécuter les migrations en production :
```bash
docker exec -it katalog-api npx prisma migrate deploy
```

---

## 💾 Procédure de Sauvegarde & Backup PostgreSQL

### 1. Script de Backup Quotidien (Automatique)
Créer un script shell `scripts/backup-db.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/katalog"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="katalog_db_${TIMESTAMP}.sql.gz"

mkdir -p ${BACKUP_DIR}

docker exec -t katalog-postgres pg_dump -U katalog katalog | gzip > "${BACKUP_DIR}/${FILENAME}"

# Conserver uniquement les backups des 30 derniers jours
find ${BACKUP_DIR} -type f -name "*.sql.gz" -mtime +30 -delete

echo "Backup PostgreSQL réussi : ${FILENAME}"
```

Ajouter dans le crontab (`crontab -e`) :
```cron
0 2 * * * /bin/bash /chemin/vers/katalog/scripts/backup-db.sh
```

### 2. Procédure de Restauration
```bash
gunzip -c /var/backups/katalog/katalog_db_XXXXXXXX_XXXXXX.sql.gz | docker exec -i katalog-postgres psql -U katalog -d katalog
```

---

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e

# Rapport de couverture
npm run test:cov
```
