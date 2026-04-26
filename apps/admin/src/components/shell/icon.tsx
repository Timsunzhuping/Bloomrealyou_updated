import {
  Factory,
  FileText,
  Gauge,
  Package,
  Palette,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';

import type { AdminMenuItem } from '@/lib/menu';

const ICONS: Record<AdminMenuItem['icon'], React.ComponentType<{ className?: string }>> = {
  gauge: Gauge,
  package: Package,
  palette: Palette,
  'shopping-bag': ShoppingBag,
  sparkles: Sparkles,
  truck: Truck,
  factory: Factory,
  users: Users,
  'file-text': FileText,
  receipt: Receipt,
  settings: Settings,
};

export function MenuIcon({
  name,
  className,
}: {
  name: AdminMenuItem['icon'];
  className?: string;
}): JSX.Element {
  const Component = ICONS[name];
  return <Component className={className} aria-hidden="true" />;
}
