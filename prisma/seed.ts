import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Reserved Slugs
  const reservedSlugs = [
    'admin',
    'superadmin',
    'official',
    'support',
    'help',
    'orange',
    'mtn',
    'moov',
    'wave',
    'catalog237',
    'katalog',
    'api',
    'auth',
    'login',
    'register',
    'checkout',
    'billing',
    'payments',
    'subscriptions',
    'dashboard',
    'settings',
    'terms',
    'privacy',
    'about',
    'contact',
    'public',
  ];

  console.log('Creating reserved slugs...');
  for (const slug of reservedSlugs) {
    await prisma.reservedSlug.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        reason: 'Reserved system keyword or brand name',
      },
    });
  }

  // 2. Default Plans
  console.log('Creating plans...');
  await prisma.plan.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      name: 'Gratuit',
      slug: 'free',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'XAF',
      maxShops: 1,
      maxProducts: 20,
      maxCatalogues: 1,
      maxAiPerMonth: 10,
      maxPdfPerMonth: 5,
      premiumTemplates: false,
      customDomain: false,
      advancedAnalytics: false,
      prioritySupport: false,
      removeBranding: false,
      active: true,
      sortOrder: 1,
    },
  });

  await prisma.plan.upsert({
    where: { slug: 'premium' },
    update: {},
    create: {
      name: 'Premium',
      slug: 'premium',
      priceMonthly: 5000,
      priceYearly: 50000,
      currency: 'XAF',
      maxShops: 3,
      maxProducts: 500,
      maxCatalogues: 10,
      maxAiPerMonth: 200,
      maxPdfPerMonth: 50,
      premiumTemplates: true,
      customDomain: true,
      advancedAnalytics: true,
      prioritySupport: true,
      removeBranding: true,
      active: true,
      sortOrder: 2,
    },
  });

  // 3. Catalogue Templates
  console.log('Creating catalogue templates...');
  const templates = [
    {
      name: 'Classique Éléganse',
      slug: 'classic-elegant',
      previewUrl: 'https://cdn.katalog.cm/templates/classic.jpg',
      configuration: {
        gridColumns: 2,
        headerStyle: 'banner',
        showPrices: true,
        showWhatsappButton: true,
        primaryColor: '#1A365D',
      },
    },
    {
      name: 'Moderne Grille',
      slug: 'modern-grid',
      previewUrl: 'https://cdn.katalog.cm/templates/modern-grid.jpg',
      configuration: {
        gridColumns: 3,
        headerStyle: 'minimal',
        showPrices: true,
        showWhatsappButton: true,
        primaryColor: '#2B6CB0',
      },
    },
    {
      name: 'Minimaliste Luxe',
      slug: 'minimalist-luxe',
      previewUrl: 'https://cdn.katalog.cm/templates/minimalist.jpg',
      configuration: {
        gridColumns: 1,
        headerStyle: 'centered',
        showPrices: true,
        showWhatsappButton: true,
        primaryColor: '#2D3748',
      },
    },
  ];

  for (const template of templates) {
    await prisma.catalogueTemplate.upsert({
      where: { slug: template.slug },
      update: {},
      create: template,
    });
  }

  // 4. Default Admin User
  console.log('Creating default super admin account...');
  const adminEmail = 'admin@katalog.cm';
  const hashedPassword = await argon2.hash('KatalogAdmin2026!');

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Super Admin Katalog',
      passwordHash: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      emailVerifiedAt: new Date(),
      locale: 'fr',
      timezone: 'Africa/Douala',
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
