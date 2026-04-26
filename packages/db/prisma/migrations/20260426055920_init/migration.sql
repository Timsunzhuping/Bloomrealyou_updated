-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('customer', 'admin', 'sales', 'designer', 'production_manager', 'finance', 'supplier_user');

-- CreateEnum
CREATE TYPE "locale" AS ENUM ('en', 'zh-CN', 'es', 'ar');

-- CreateEnum
CREATE TYPE "currency" AS ENUM ('USD', 'EUR', 'GBP', 'AED', 'CNY');

-- CreateEnum
CREATE TYPE "product_category" AS ENUM ('t-shirts', 'hoodies', 'mugs', 'hats', 'tote-bags', 'stickers');

-- CreateEnum
CREATE TYPE "print_method" AS ENUM ('dtg', 'screen_printing', 'embroidery', 'heat_transfer', 'uv_printing', 'sublimation');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('draft', 'active', 'archived', 'discontinued');

-- CreateEnum
CREATE TYPE "design_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "cart_status" AS ENUM ('active', 'abandoned', 'converted', 'expired');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'authorized', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('stripe', 'paypal', 'manual_invoice');

-- CreateEnum
CREATE TYPE "supplier_status" AS ENUM ('active', 'inactive', 'suspended', 'onboarding');

-- CreateEnum
CREATE TYPE "production_job_status" AS ENUM ('queued', 'assigned', 'in_progress', 'quality_check', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "shipment_status" AS ENUM ('pending', 'label_created', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'failed');

-- CreateEnum
CREATE TYPE "rfq_status" AS ENUM ('submitted', 'under_review', 'quoted', 'won', 'lost', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "quote_status" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired', 'revised');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('email', 'sms', 'in_app', 'webhook');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('create', 'update', 'delete', 'soft_delete', 'restore', 'login', 'logout', 'role_change', 'status_change', 'export', 'approve', 'reject');

-- CreateEnum
CREATE TYPE "ai_request_status" AS ENUM ('success', 'failed', 'rate_limited', 'timeout');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "accountManagerId" UUID,
    "netPaymentTermsDays" INTEGER,
    "defaultBillingAddress" JSONB,
    "defaultShippingAddress" JSONB,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "locale" "locale" NOT NULL DEFAULT 'en',
    "role" "user_role" NOT NULL DEFAULT 'customer',
    "organizationId" UUID,
    "defaultShippingAddress" JSONB,
    "defaultBillingAddress" JSONB,
    "metadata" JSONB,
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "product_category" NOT NULL,
    "status" "product_status" NOT NULL DEFAULT 'draft',
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "supportedPrintMethods" "print_method"[],
    "gallery" JSONB NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "basePriceAmountMinor" INTEGER NOT NULL,
    "tags" TEXT[],
    "productionLeadDays" INTEGER NOT NULL DEFAULT 7,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "priceAmountMinor" INTEGER NOT NULL,
    "weightGrams" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_print_areas" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "widthPx" INTEGER NOT NULL,
    "heightPx" INTEGER NOT NULL,
    "mockupOffsetXPx" INTEGER NOT NULL DEFAULT 0,
    "mockupOffsetYPx" INTEGER NOT NULL DEFAULT 0,
    "allowedPrintMethods" "print_method"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_print_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_tiers" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "unitPriceAmountMinor" INTEGER NOT NULL,
    "printMethod" "print_method",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customization_templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "productId" UUID NOT NULL,
    "applicablePrintAreaKeys" TEXT[],
    "previewImageUrl" TEXT NOT NULL,
    "designJson" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customization_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_designs" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "organizationId" UUID,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "name" TEXT NOT NULL,
    "status" "design_status" NOT NULL DEFAULT 'draft',
    "designJson" JSONB NOT NULL,
    "previewImageUrl" TEXT,
    "reviewerNotes" TEXT,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "validationResult" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "organizationId" UUID,
    "status" "cart_status" NOT NULL DEFAULT 'active',
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "subtotalAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "shippingAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "taxAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "promoCode" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "designId" UUID,
    "quantity" INTEGER NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "unitPriceAmountMinor" INTEGER NOT NULL,
    "lineTotalAmountMinor" INTEGER NOT NULL,
    "customizations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerUserId" UUID NOT NULL,
    "organizationId" UUID,
    "status" "order_status" NOT NULL DEFAULT 'pending',
    "locale" "locale" NOT NULL DEFAULT 'en',
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "subtotalAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "shippingAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "taxAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "discountAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "rushFeeAmountMinor" INTEGER,
    "shippingAddress" JSONB NOT NULL,
    "billingAddress" JSONB NOT NULL,
    "promoCode" TEXT,
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "metadata" JSONB,
    "sourceQuoteId" UUID,
    "sourceRfqId" UUID,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "designId" UUID,
    "productNameSnapshot" TEXT NOT NULL,
    "variantSkuSnapshot" TEXT NOT NULL,
    "designJsonSnapshot" JSONB,
    "quantity" INTEGER NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "unitPriceAmountMinor" INTEGER NOT NULL,
    "lineTotalAmountMinor" INTEGER NOT NULL,
    "customizations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL,
    "providerReference" TEXT NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "amountMinor" INTEGER NOT NULL,
    "refundedAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "providerMetadata" JSONB,
    "authorizedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "status" "supplier_status" NOT NULL DEFAULT 'active',
    "capabilities" "print_method"[],
    "countryCode" TEXT NOT NULL,
    "address" JSONB,
    "avgLeadDays" INTEGER NOT NULL DEFAULT 7,
    "qualityScore" INTEGER,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_product_mappings" (
    "id" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "printMethod" "print_method" NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "unitCostAmountMinor" INTEGER NOT NULL,
    "minOrderQuantity" INTEGER NOT NULL DEFAULT 1,
    "dailyCapacity" INTEGER,
    "leadDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_product_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_jobs" (
    "id" UUID NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "orderId" UUID NOT NULL,
    "supplierId" UUID,
    "printMethod" "print_method" NOT NULL,
    "status" "production_job_status" NOT NULL DEFAULT 'queued',
    "quantity" INTEGER NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "supplierCostAmountMinor" INTEGER,
    "expectedReadyAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "qcNotes" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_job_order_items" (
    "productionJobId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,

    CONSTRAINT "production_job_order_items_pkey" PRIMARY KEY ("productionJobId","orderItemId")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "carrier" TEXT NOT NULL,
    "serviceLevel" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "status" "shipment_status" NOT NULL DEFAULT 'pending',
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "shippingCostAmountMinor" INTEGER,
    "packageWeightGrams" INTEGER,
    "shippedAt" TIMESTAMP(3),
    "estimatedDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_production_jobs" (
    "shipmentId" UUID NOT NULL,
    "productionJobId" UUID NOT NULL,

    CONSTRAINT "shipment_production_jobs_pkey" PRIMARY KEY ("shipmentId","productionJobId")
);

-- CreateTable
CREATE TABLE "rfqs" (
    "id" UUID NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "requesterUserId" UUID,
    "organizationId" UUID,
    "guestEmail" TEXT,
    "guestName" TEXT,
    "guestCompany" TEXT,
    "status" "rfq_status" NOT NULL DEFAULT 'submitted',
    "locale" "locale" NOT NULL DEFAULT 'en',
    "requiredBy" TIMESTAMP(3),
    "notes" TEXT,
    "shippingAddress" JSONB,
    "attachmentUrls" TEXT[],
    "assignedSalesUserId" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_items" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "productId" UUID,
    "variantId" UUID,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "preferredPrintMethod" "print_method",
    "targetUnitPriceText" TEXT,
    "attachmentUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "rfqId" UUID,
    "customerUserId" UUID,
    "organizationId" UUID,
    "authorUserId" UUID NOT NULL,
    "status" "quote_status" NOT NULL DEFAULT 'draft',
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "subtotalAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "shippingAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "taxAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "discountAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "rushFeeAmountMinor" INTEGER,
    "validUntil" TIMESTAMP(3),
    "termsText" TEXT,
    "internalNotes" TEXT,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "productId" UUID,
    "variantId" UUID,
    "description" TEXT NOT NULL,
    "printMethod" "print_method",
    "quantity" INTEGER NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'USD',
    "unitPriceAmountMinor" INTEGER NOT NULL,
    "lineTotalAmountMinor" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "actorIp" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "audit_action" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "summary" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "recipientUserId" UUID,
    "recipientAddress" TEXT NOT NULL,
    "channel" "notification_channel" NOT NULL DEFAULT 'email',
    "templateKey" TEXT NOT NULL,
    "locale" "locale" NOT NULL DEFAULT 'en',
    "variables" JSONB,
    "status" "notification_status" NOT NULL DEFAULT 'pending',
    "providerMessageId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_request_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "locale" "locale",
    "status" "ai_request_status" NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "currency" "currency",
    "costAmountMinor" INTEGER,
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "correlationId" TEXT,
    "entityRef" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organizations_accountManagerId_idx" ON "organizations"("accountManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE INDEX "product_print_areas_productId_idx" ON "product_print_areas"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_print_areas_productId_key_key" ON "product_print_areas"("productId", "key");

-- CreateIndex
CREATE INDEX "product_price_tiers_productId_minQuantity_idx" ON "product_price_tiers"("productId", "minQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "customization_templates_slug_key" ON "customization_templates"("slug");

-- CreateIndex
CREATE INDEX "customization_templates_productId_idx" ON "customization_templates"("productId");

-- CreateIndex
CREATE INDEX "customer_designs_ownerUserId_idx" ON "customer_designs"("ownerUserId");

-- CreateIndex
CREATE INDEX "customer_designs_productId_idx" ON "customer_designs"("productId");

-- CreateIndex
CREATE INDEX "customer_designs_status_idx" ON "customer_designs"("status");

-- CreateIndex
CREATE INDEX "carts_userId_idx" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "carts_status_idx" ON "carts"("status");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_customerUserId_idx" ON "orders"("customerUserId");

-- CreateIndex
CREATE INDEX "orders_organizationId_idx" ON "orders"("organizationId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_sourceRfqId_idx" ON "orders"("sourceRfqId");

-- CreateIndex
CREATE INDEX "orders_sourceQuoteId_idx" ON "orders"("sourceQuoteId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_provider_providerReference_idx" ON "payments"("provider", "providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "supplier_product_mappings_supplierId_idx" ON "supplier_product_mappings"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_product_mappings_productId_idx" ON "supplier_product_mappings"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_product_mappings_supplierId_productId_variantId_pr_key" ON "supplier_product_mappings"("supplierId", "productId", "variantId", "printMethod");

-- CreateIndex
CREATE UNIQUE INDEX "production_jobs_jobNumber_key" ON "production_jobs"("jobNumber");

-- CreateIndex
CREATE INDEX "production_jobs_orderId_idx" ON "production_jobs"("orderId");

-- CreateIndex
CREATE INDEX "production_jobs_supplierId_idx" ON "production_jobs"("supplierId");

-- CreateIndex
CREATE INDEX "production_jobs_status_idx" ON "production_jobs"("status");

-- CreateIndex
CREATE INDEX "shipments_orderId_idx" ON "shipments"("orderId");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rfqs_rfqNumber_key" ON "rfqs"("rfqNumber");

-- CreateIndex
CREATE INDEX "rfqs_requesterUserId_idx" ON "rfqs"("requesterUserId");

-- CreateIndex
CREATE INDEX "rfqs_organizationId_idx" ON "rfqs"("organizationId");

-- CreateIndex
CREATE INDEX "rfqs_status_idx" ON "rfqs"("status");

-- CreateIndex
CREATE INDEX "rfq_items_rfqId_idx" ON "rfq_items"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");

-- CreateIndex
CREATE INDEX "quotes_rfqId_idx" ON "quotes"("rfqId");

-- CreateIndex
CREATE INDEX "quotes_customerUserId_idx" ON "quotes"("customerUserId");

-- CreateIndex
CREATE INDEX "quotes_authorUserId_idx" ON "quotes"("authorUserId");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quote_items_quoteId_idx" ON "quote_items"("quoteId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_occurredAt_idx" ON "audit_logs"("occurredAt");

-- CreateIndex
CREATE INDEX "notification_logs_recipientUserId_idx" ON "notification_logs"("recipientUserId");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_templateKey_idx" ON "notification_logs"("templateKey");

-- CreateIndex
CREATE INDEX "ai_request_logs_userId_idx" ON "ai_request_logs"("userId");

-- CreateIndex
CREATE INDEX "ai_request_logs_feature_idx" ON "ai_request_logs"("feature");

-- CreateIndex
CREATE INDEX "ai_request_logs_status_idx" ON "ai_request_logs"("status");

-- CreateIndex
CREATE INDEX "ai_request_logs_occurredAt_idx" ON "ai_request_logs"("occurredAt");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_print_areas" ADD CONSTRAINT "product_print_areas_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_tiers" ADD CONSTRAINT "product_price_tiers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customization_templates" ADD CONSTRAINT "customization_templates_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_designs" ADD CONSTRAINT "customer_designs_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_designs" ADD CONSTRAINT "customer_designs_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_designs" ADD CONSTRAINT "customer_designs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_designs" ADD CONSTRAINT "customer_designs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_designs" ADD CONSTRAINT "customer_designs_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_designId_fkey" FOREIGN KEY ("designId") REFERENCES "customer_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sourceQuoteId_fkey" FOREIGN KEY ("sourceQuoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sourceRfqId_fkey" FOREIGN KEY ("sourceRfqId") REFERENCES "rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_designId_fkey" FOREIGN KEY ("designId") REFERENCES "customer_designs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_product_mappings" ADD CONSTRAINT "supplier_product_mappings_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_jobs" ADD CONSTRAINT "production_jobs_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_job_order_items" ADD CONSTRAINT "production_job_order_items_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "production_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_job_order_items" ADD CONSTRAINT "production_job_order_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_production_jobs" ADD CONSTRAINT "shipment_production_jobs_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_production_jobs" ADD CONSTRAINT "shipment_production_jobs_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "production_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_assignedSalesUserId_fkey" FOREIGN KEY ("assignedSalesUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_request_logs" ADD CONSTRAINT "ai_request_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
