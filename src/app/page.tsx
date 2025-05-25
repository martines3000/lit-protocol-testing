import Link from 'next/link';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Link href="/claim">Claim</Link>
      <Link href="/mint">Mint</Link>
    </main>
  );
}
