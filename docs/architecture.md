# Katalog Backend — Architecture & Design System

## Executive Overview
Katalog is an enterprise-grade multi-tenant SaaS backend enabling merchants to build and publish professional product catalogs automatically. Built with NestJS 11, TypeScript, PostgreSQL, Prisma ORM, Redis, and BullMQ.

---

## High-Level System Architecture

```mermaid
graph TD
    Client[Mobile App / Web Frontend / Public Viewers] --> API[NestJS API Gateway / Port 3000]
    
    subgraph Security & Middleware Layer
        API --> Throttle[Throttler / Redis Rate Limiter]
        API --> AuthGuard[JWT / OAuth2 / TOTP 2FA Guard]
        API --> ShopGuard[ShopAccessGuard Tenant Isolation]
    end

    subgraph Business Logic Layer
        AuthGuard --> AuthModule[Auth & User Module]
        ShopGuard --> ShopModule[Shops Module]
        ShopGuard --> ProductModule[Products & Collections Module]
        ShopGuard --> CatalogModule[Catalogues & Templates Module]
        ShopGuard --> SubModule[Subscriptions & Quota Service]
    end

    subgraph Integration Adapters (Hexagonal Ports)
        ShopModule --> StorageAdapter[StorageProvider: S3 / Cloudflare R2]
        ProductModule --> AIAdapter[AIProvider: OpenAI GPT-4o Vision]
        SubModule --> PaymentAdapter[PaymentProvider: Stripe / CinetPay / NotchPay / PawaPay]
        AuthModule --> EmailAdapter[EmailProvider: Resend / SendGrid / SES]
    end

    subgraph Async Background Processing
        ProductModule --> Queue[BullMQ / Redis]
        Queue --> ImageWorker[Image Pipeline Worker: Sharp + Moderation]
        Queue --> PDFWorker[PDF Generator Worker: pdf-lib]
        Queue --> ReconcileCron[Payment Reconciliation Cron Job]
    end

    subgraph Persistence Layer
        Business Logic Layer --> DB[(PostgreSQL 16 Multi-Tenant DB)]
        Security & Middleware Layer --> Redis[(Redis 7 Cache & Session Store)]
    end
```

---

## Core Pillars & Mechanisms

### 1. Multi-Tenant Data Isolation
- **Tenant Context**: All shop resources (`Product`, `Category`, `Collection`, `Catalogue`, `AnalyticsEvent`, `Subscription`) carry a mandatory `shopId` foreign key.
- **Server-Side Verification**: `ShopAccessGuard` intercepts requests containing `:shopId` parameters and validates that the authenticated user possesses an active entry in `shop_members`. Client-provided `shopId` values are never trusted implicitly.
- **Plan Enforcement**: `QuotaService` strictly enforces `maxShops` per `ownerId` prior to shop creation to block multi-account quota bypass attempts.

### 2. External Provider & Adapter Pattern
Services interacting with third parties implement strict TypeScript interfaces (`Ports`):
- `PaymentProvider`: `createCheckout()`, `verifyPayment()`, `handleWebhook()`, `cancelSubscription()`, `getSubscription()`
- `AIProvider`: `analyzeProductImage()`, `suggestProductName()`, `suggestCategory()`, `generateProductDescription()`, `detectProductBoundingBox()`, `moderateImageContent()`
- `StorageProvider`: `upload()`, `delete()`, `getUrl()`, `generateSignedUrl()`
- `EmailProvider`: `sendVerificationEmail()`, `sendPasswordResetEmail()`, `sendWelcomeEmail()`, `sendPaymentConfirmation()`, etc.

### 3. Payment Security & Anti-Fraud
- **Idempotency**: All payment transactions specify a unique `idempotencyKey`.
- **Webhook Signature Verification**: Webhook payloads are verified cryptographically before execution.
- **No Client-Side Subscription Activation**: Subscriptions transitions to `ACTIVE` exclusively via verified webhooks or the daily automated reconciliation job.
- **Stripe Chargeback Dispute Lifecycle**: Disputes automatically mark subscriptions as `DISPUTED` and suspend premium capabilities if lost.

### 4. Asynchronous Image & PDF Processing
- **Image Pipeline (9 steps)**: Upload → Validation → Async Moderation → Vision Analysis → Bounding Box Detection → Smart Cropping → Sharp WebP Optimization → Thumbnail Generation → Storage Update.
- **Original Asset Preservation**: The raw uploaded asset is stored permanently to allow merchants to revert transformations.
- **Moderation Flagging**: Flagged images set `product.status = PENDING_REVIEW` and dispatch alerts to platform administrators.

### 5. Public Catalog Analytics Anti-Tampering
- **Rate Limiting**: Public analytics ingestion endpoint applies dedicated rate limits (max 60 req/min per IP).
- **30-Minute Deduplication Window**: Events are hashed as `SHA256(IP + UserAgent + shopId + eventType)` and cached in Redis with a 30-minute TTL. Duplicate events are silently dropped.
