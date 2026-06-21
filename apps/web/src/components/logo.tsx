import Image from 'next/image';
import { Link } from '@/i18n/navigation';

export function Logo() {
  return (
    <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
      <Image
        src="/images/logo.png"
        alt="Bloomrealyou"
        width={160}
        height={48}
        className="h-12 w-auto object-contain"
        priority
      />
    </Link>
  );
}
