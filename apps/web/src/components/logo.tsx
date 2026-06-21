import Image from 'next/image';
import { Link } from '@/i18n/navigation';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
      <Image
        src="/images/logo.png"
        alt="Bloomrealyou Logo"
        width={40}
        height={40}
        className="h-10 w-10 object-contain"
        priority
      />
      <span className="hidden font-bold text-lg sm:inline">Bloomrealyou</span>
    </Link>
  );
}
