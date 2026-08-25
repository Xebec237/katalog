# Services Externes — Guide d'Intégration

> Ce document liste tous les services externes nécessaires au fonctionnement du SaaS.
> Chaque service est appelé via une couche d'abstraction (Provider/Adapter) — donc remplaçable sans réécrire l'application.
>
> **Le seul point à brancher manuellement pour lancer une v1 fonctionnelle est le paiement (section 3).**
> Tout le reste peut tourner avec les fournisseurs recommandés ci-dessous ou leurs équivalents.

---

## 1. Authentification

| Service      | Usage                              | Où l'obtenir                                              |
| ------------ | ---------------------------------- | --------------------------------------------------------- |
| Google OAuth | Connexion "Se connecter avec Google" | console.cloud.google.com → Créer des identifiants OAuth 2.0 |

**Variables d'environnement :**

```env
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

---

## 2. Intelligence artificielle (analyse produit + image)

| Fonction                                          | Service recommandé                                      | Alternative                              |
| ------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| Identification produit (nom, catégorie, description) | OpenAI GPT-4o / GPT-4o-mini (vision)                   | Anthropic Claude (vision), Google Gemini |
| Recadrage / amélioration image                    | Remove.bg (détourage) + Sharp (traitement local)        | Cloudinary AI, Photoroom API             |
| Modération de contenu image                       | OpenAI Moderation API, ou Google Cloud Vision SafeSearch | AWS Rekognition                          |

**Variables d'environnement :**

```env
AI_PROVIDER=openai
AI_API_KEY
```

> L'architecture (`AIProvider` avec `analyzeProductImage()`, `moderateImageContent()`, etc.) permet de changer de fournisseur sans toucher au reste du code — tu peux commencer avec un seul fournisseur pour tout (ex. OpenAI) puis séparer plus tard si besoin.

---

## 3. Paiement — LE POINT À CONNECTER TOI-MÊME

> C'est la seule brique que le prompt laisse volontairement en interface prête à l'emploi, sans choix figé, car c'est une décision business (frais, couverture pays, délais de règlement) que toi seul peux trancher.

### Cartes bancaires / diaspora

| Service | Usage                                                        |
| ------- | ------------------------------------------------------------ |
| Stripe  | Paiement par carte, abonnements récurrents, gestion des litiges/chargebacks |

```env
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

### Mobile Money (Afrique)

> **Recommandation** : passer par un agrégateur plutôt qu'une intégration directe MTN/Orange (voir annexe fraude) — plus rapide à intégrer, gère déjà le KYC.

| Agrégateur | Pays couverts (à vérifier à jour)                              | Notes                                      |
| ---------- | -------------------------------------------------------------- | ------------------------------------------ |
| CinetPay   | Cameroun, Côte d'Ivoire, Sénégal, Mali, Burkina Faso, RDC     | Le plus utilisé au Cameroun                |
| NotchPay   | Cameroun principalement                                        | Bonne doc développeur                      |
| PawaPay    | Multi-pays Afrique de l'Est et Ouest                           | Bon si expansion hors zone CEMAC prévue    |

```env
PAYMENT_PROVIDER=cinetpay
CINETPAY_API_KEY
CINETPAY_SITE_ID
NOTCHPAY_API_KEY
PAWAPAY_API_KEY
```

### Ce qu'il te reste à faire concrètement :

1. **Choisir un agrégateur** (CinetPay est le choix le plus simple pour démarrer au Cameroun)
2. **Créer un compte marchand** chez eux, obtenir les clés API
3. **Implémenter l'adaptateur** correspondant à l'interface `PaymentProvider` déjà définie dans le backend (`createCheckout()`, `verifyPayment()`, `handleWebhook()`, `cancelSubscription()`, `getSubscription()`)
4. **Configurer l'URL de webhook** chez le fournisseur pour qu'il notifie ton backend

> Tout le reste (activation d'abonnement, quotas, statuts) est déjà prévu pour consommer cette interface sans modification.

---

## 4. Stockage d'images

| Service       | Usage                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Cloudflare R2 | Stockage des photos produits (compatible S3, pas de frais de sortie)          |
| AWS S3        | Alternative standard                                                          |
| Cloudinary    | Alternative avec transformation d'image intégrée (recadrage, thumbnails côté service) |

**Variables d'environnement :**

```env
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET
```

> **Recommandation pour démarrer** : Cloudflare R2 (moins cher, pas de frais de sortie de données, ce qui compte si le catalogue public génère beaucoup de trafic image).

---

## 5. Email transactionnel

| Service    | Usage                                                                            |
| ---------- | -------------------------------------------------------------------------------- |
| Resend     | Emails transactionnels (vérification, reset password, confirmation paiement) — API simple, bon pour démarrer |
| SendGrid   | Alternative plus établie                                                         |
| Amazon SES | Alternative la moins chère à volume élevé                                        |

**Variables d'environnement :**

```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY
```

---

## 6. QR Code

Pas besoin de service externe payant : génération possible en local avec une librairie (ex. `qrcode` en Node.js). **Aucune clé API nécessaire.**

---

## 7. WhatsApp (canal de commande)

Pas d'API WhatsApp Business nécessaire pour la v1. Le lien "Commander sur WhatsApp" utilise le protocole `wa.me` standard (lien profond gratuit, sans compte développeur) :

```
https://wa.me/[numéro]?text=[message pré-rempli encodé]
```

> Si tu veux plus tard automatiser les réponses ou gérer les commandes depuis un tableau de bord (hors scope actuel), il faudrait alors l'API WhatsApp Business officielle (Meta) — mais ce n'est pas nécessaire pour le fonctionnement actuel du produit.

---

## 8. PDF

Pas de service externe : génération côté serveur avec une librairie (ex. Puppeteer ou pdf-lib en Node.js). **Aucune clé API nécessaire.**

---

## Récapitulatif — fichier `.env.example` complet

```env
# Base de données
DATABASE_URL
REDIS_URL

# Sécurité
JWT_SECRET
SESSION_SECRET

# Auth Google
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Stockage
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET

# IA
AI_PROVIDER
AI_API_KEY

# Paiement — À CONNECTER
PAYMENT_PROVIDER
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
CINETPAY_API_KEY
CINETPAY_SITE_ID
NOTCHPAY_API_KEY
PAWAPAY_API_KEY

# Email
EMAIL_PROVIDER
EMAIL_API_KEY

# URLs
APP_URL
API_URL
PUBLIC_CATALOG_URL
```

---

## Ordre recommandé pour brancher les services

1. **Base de données + Redis** (obligatoire pour démarrer, aucune clé externe)
2. **Google OAuth** (rapide, 10 minutes de config)
3. **Stockage (Cloudflare R2)** (nécessaire dès le premier upload produit)
4. **IA (OpenAI)** (nécessaire pour la fonctionnalité d'analyse produit)
5. **Email (Resend)** (nécessaire pour la vérification de compte)
6. **Paiement (CinetPay ou autre)** — dernier maillon, celui que tu veux garder pour la fin
