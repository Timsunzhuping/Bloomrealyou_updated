import { hasAdminPermission } from '@custom-merch/shared';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { ProductListingWorkspace } from '@/components/products/product-listing-workspace';
import { getCurrentAdminUser } from '@/lib/admin-user';

export default async function ProductListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentAdminUser();
  if (!user || !hasAdminPermission(user.permissions, 'products.write'))
    redirect(`/${locale}/forbidden`);
  return <ProductListingWorkspace />;
}
