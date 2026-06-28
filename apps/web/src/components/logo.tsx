import { BrandLogo } from '@custom-merch/ui';

import { Link } from '@/i18n/navigation';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
      <BrandLogo markSize={38} textClassName="hidden text-lg sm:inline" />
    </Link>
  );
}
