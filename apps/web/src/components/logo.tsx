import Image from 'next/image';
import { Link } from '@/i18n/navigation';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
      <Image
        src="/images/logo.png"
        alt="Bloomrealyou"
        width={44}
        height={44}
        className="h-11 w-11 object-contain"
        priority
      />
      <span className="hidden text-lg font-bold tracking-tight text-foreground sm:inline">
        Bloom<span className="text-[#ED6B2D]">real</span>you
      </span>
    </Link>
  );
}
