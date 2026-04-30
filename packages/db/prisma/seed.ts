/**
 * WP-02 seed — populates the database with the platform's MVP catalog,
 * suppliers, design templates, and a pair of test users.
 *
 * Idempotent: every model is upserted by a stable unique key, so re-running
 * `pnpm db:seed` against a partially-populated database is safe.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

import { SEED_PRODUCTS, type SeedProductSpec } from './seed-data/products';
import { SEED_SUPPLIERS } from './seed-data/suppliers';
import { SEED_TEMPLATES } from './seed-data/templates';

const prisma = new PrismaClient();

async function seedUsers(): Promise<void> {
  const adminPasswordHash = await hash('admin123', 10);
  const customerPasswordHash = await hash('customer123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@custom-merch.test' },
    update: {
      role: 'admin',
      isActive: true,
    },
    create: {
      email: 'admin@custom-merch.test',
      passwordHash: adminPasswordHash,
      fullName: 'Platform Admin',
      role: 'admin',
      locale: 'en',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@custom-merch.test' },
    update: {
      role: 'customer',
      isActive: true,
    },
    create: {
      email: 'customer@custom-merch.test',
      passwordHash: customerPasswordHash,
      fullName: 'Test Customer',
      role: 'customer',
      locale: 'en',
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });
}

async function seedProduct(spec: SeedProductSpec): Promise<void> {
  const product = await prisma.product.upsert({
    where: { slug: spec.slug },
    update: {
      category: spec.category,
      status: 'active',
      name: spec.name,
      description: spec.description,
      supportedPrintMethods: spec.supportedPrintMethods,
      gallery: spec.gallery,
      basePriceAmountMinor: spec.basePriceAmountMinor,
      productionLeadDays: spec.productionLeadDays,
      tags: spec.tags,
    },
    create: {
      slug: spec.slug,
      category: spec.category,
      status: 'active',
      name: spec.name,
      description: spec.description,
      supportedPrintMethods: spec.supportedPrintMethods,
      gallery: spec.gallery,
      basePriceAmountMinor: spec.basePriceAmountMinor,
      productionLeadDays: spec.productionLeadDays,
      tags: spec.tags,
    },
  });

  // ---- Variants
  for (const variant of spec.variants) {
    const sku = `${spec.slug}__${variant.skuSuffix}`;
    await prisma.productVariant.upsert({
      where: { sku },
      update: {
        attributes: variant.attributes,
        priceAmountMinor: variant.priceAmountMinor ?? spec.basePriceAmountMinor,
        weightGrams: variant.weightGrams ?? null,
        isActive: true,
      },
      create: {
        productId: product.id,
        sku,
        attributes: variant.attributes,
        priceAmountMinor: variant.priceAmountMinor ?? spec.basePriceAmountMinor,
        weightGrams: variant.weightGrams ?? null,
        isActive: true,
      },
    });
  }

  // ---- Print areas (composite unique on productId + key)
  for (const area of spec.printAreas) {
    await prisma.productPrintArea.upsert({
      where: { productId_key: { productId: product.id, key: area.key } },
      update: {
        label: area.label,
        widthPx: area.widthPx,
        heightPx: area.heightPx,
        mockupOffsetXPx: area.mockupOffsetXPx ?? 0,
        mockupOffsetYPx: area.mockupOffsetYPx ?? 0,
        allowedPrintMethods: area.allowedPrintMethods,
      },
      create: {
        productId: product.id,
        key: area.key,
        label: area.label,
        widthPx: area.widthPx,
        heightPx: area.heightPx,
        mockupOffsetXPx: area.mockupOffsetXPx ?? 0,
        mockupOffsetYPx: area.mockupOffsetYPx ?? 0,
        allowedPrintMethods: area.allowedPrintMethods,
      },
    });
  }

  // ---- Price tiers (no natural unique key — wipe + recreate is fine for seed)
  await prisma.productPriceTier.deleteMany({ where: { productId: product.id } });
  for (const tier of spec.priceTiers) {
    await prisma.productPriceTier.create({
      data: {
        productId: product.id,
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        unitPriceAmountMinor: tier.unitPriceAmountMinor,
      },
    });
  }
}

async function seedSuppliers(): Promise<void> {
  for (const spec of SEED_SUPPLIERS) {
    const supplier = await prisma.supplier.upsert({
      where: { name: spec.name },
      update: {
        contactEmail: spec.contactEmail,
        contactPhone: spec.contactPhone ?? null,
        capabilities: spec.capabilities,
        countryCode: spec.countryCode,
        avgLeadDays: spec.avgLeadDays,
        qualityScore: spec.qualityScore,
        notes: spec.notes ?? null,
        status: 'active',
      },
      create: {
        name: spec.name,
        contactEmail: spec.contactEmail,
        contactPhone: spec.contactPhone ?? null,
        capabilities: spec.capabilities,
        countryCode: spec.countryCode,
        avgLeadDays: spec.avgLeadDays,
        qualityScore: spec.qualityScore,
        notes: spec.notes ?? null,
        status: 'active',
      },
    });

    for (const mapping of spec.productMappings) {
      const product = await prisma.product.findUnique({ where: { slug: mapping.productSlug } });
      if (!product) continue;
      // The unique key is (supplierId, productId, variantId, printMethod). With
      // variantId NULL we can't use upsert (NULLs aren't deduped by unique
      // constraints), so we use deleteMany + create for idempotency.
      await prisma.supplierProductMapping.deleteMany({
        where: {
          supplierId: supplier.id,
          productId: product.id,
          variantId: null,
          printMethod: mapping.printMethod,
        },
      });
      await prisma.supplierProductMapping.create({
        data: {
          supplierId: supplier.id,
          productId: product.id,
          variantId: null,
          printMethod: mapping.printMethod,
          unitCostAmountMinor: mapping.unitCostAmountMinor,
          minOrderQuantity: mapping.minOrderQuantity ?? 1,
          dailyCapacity: mapping.dailyCapacity ?? null,
          leadDays: mapping.leadDays ?? null,
          isActive: true,
        },
      });
    }
  }
}

async function seedTemplates(): Promise<void> {
  for (const spec of SEED_TEMPLATES) {
    const product = await prisma.product.findUnique({ where: { slug: spec.productSlug } });
    if (!product) continue;
    const designJson = spec.designJson as unknown as Prisma.InputJsonValue;
    await prisma.customizationTemplate.upsert({
      where: { slug: spec.slug },
      update: {
        name: spec.name,
        description: spec.description,
        productId: product.id,
        applicablePrintAreaKeys: spec.applicablePrintAreaKeys,
        previewImageUrl: spec.previewImageUrl,
        designJson,
        isPublic: true,
        tags: spec.tags,
      },
      create: {
        slug: spec.slug,
        name: spec.name,
        description: spec.description,
        productId: product.id,
        applicablePrintAreaKeys: spec.applicablePrintAreaKeys,
        previewImageUrl: spec.previewImageUrl,
        designJson,
        isPublic: true,
        tags: spec.tags,
      },
    });
  }
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[db:seed] Seeding users …');
  await seedUsers();

  // eslint-disable-next-line no-console
  console.log(`[db:seed] Seeding ${SEED_PRODUCTS.length} products …`);
  for (const product of SEED_PRODUCTS) {
    await seedProduct(product);
  }

  // eslint-disable-next-line no-console
  console.log(`[db:seed] Seeding ${SEED_SUPPLIERS.length} suppliers + product mappings …`);
  await seedSuppliers();

  // eslint-disable-next-line no-console
  console.log(`[db:seed] Seeding ${SEED_TEMPLATES.length} customization templates …`);
  await seedTemplates();

  // eslint-disable-next-line no-console
  console.log('[db:seed] Done ✓');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[db:seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
