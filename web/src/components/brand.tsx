import Image from 'next/image';
import Link from 'next/link';

export function Brand() {
  return (
    <Link href="/" className="brand">
      <span className="brand-logo brand-logo-dark">
        <Image
          src="/branding/soulmeet-logo-dark.png"
          alt=""
          width={34}
          height={34}
          unoptimized
        />
      </span>
      <span className="brand-logo brand-logo-light">
        <Image
          src="/branding/soulmeet-logo-light.png"
          alt=""
          width={34}
          height={34}
          unoptimized
        />
      </span>
      <span>Soulmeet</span>
    </Link>
  );
}