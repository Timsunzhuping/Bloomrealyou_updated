'use client';

import { formatCurrency, formatLocalisedDate, type Locale } from '@custom-merch/i18n';
import type { OrderDto, OrderStatus } from '@custom-merch/shared';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  OrderStatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

const TIMELINE_STATUS_TONE: Record<OrderStatus, Parameters<typeof OrderStatusBadge>[0]['status']> = {
  pending: 'pending',
  pending_payment: 'pending',
  paid: 'paid',
  design_review: 'in_production',
  design_approved: 'in_production',
  production_assigned: 'in_production',
  in_production: 'in_production',
  quality_inspection: 'in_production',
  shipped: 'shipped',
  delivered: 'delivered',
  completed: 'delivered',
  cancelled: 'cancelled',
  refunded: 'refunded',
  exception: 'cancelled',
};

export function AccountOrdersList({ locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('account.orders');
  const tStatus = useTranslations('account.orders.status');
  const [orders, setOrders] = React.useState<OrderDto[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getClientApi().account.listOrders();
        if (!cancelled) setOrders(list);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <ErrorState title={t('empty')} description={t('empty')} />;
  }
  if (!orders) {
    return <LoadingState label={t('viewDetails')} />;
  }
  if (orders.length === 0) {
    return (
      <EmptyState
        title={t('empty')}
        action={
          <Button asChild>
            <Link href="/products">{t('detail.back')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('tableHeaders.orderNumber')}</TableHead>
          <TableHead>{t('tableHeaders.placed')}</TableHead>
          <TableHead>{t('tableHeaders.status')}</TableHead>
          <TableHead className="text-end">{t('tableHeaders.total')}</TableHead>
          <TableHead aria-hidden="true" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.orderNumber}</TableCell>
            <TableCell>{formatLocalisedDate(order.placedAt, locale, 'short-date')}</TableCell>
            <TableCell>
              <OrderStatusBadge status={TIMELINE_STATUS_TONE[order.status]} label={tStatus(order.status)} />
            </TableCell>
            <TableCell className="text-end font-medium">
              {formatCurrency(order.total, locale)}
            </TableCell>
            <TableCell className="text-end">
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t('viewDetails')}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
