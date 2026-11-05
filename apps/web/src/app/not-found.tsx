import Link from 'next/link';
import { ColumnMark } from '@/components/brand/logo';

export default function NotFound() {
  return (
    <main className="flutes flex min-h-dvh flex-col items-center justify-center bg-frame px-6 text-center text-frame-ink">
      <ColumnMark className="h-14 w-auto" />
      <h1 className="mt-6 font-display text-[40px] leading-tight">
        This page is not on the ledger
      </h1>
      <p className="mt-2 text-[15px] text-frame-ink-2">
        The link may be old, or the page may have moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-white px-5 py-2.5 text-[14px] font-bold text-oak-900 transition hover:bg-oak-50"
      >
        Back to Overview
      </Link>
    </main>
  );
}
