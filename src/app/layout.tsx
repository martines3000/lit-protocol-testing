import './globals.css';
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';

import { cn } from '@/lib/utils';
import { Providers } from './Providers';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn('bg-background font-sans antialiased', fontSans.variable)}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
