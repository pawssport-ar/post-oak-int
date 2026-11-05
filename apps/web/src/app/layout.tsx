import type { Metadata, Viewport } from 'next';
import { EB_Garamond, Nunito_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

const garamond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-garamond',
  display: 'swap',
});

const nunito = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Post Oak Business Banking',
    template: '%s · Post Oak Business Banking',
  },
  description:
    'A banking dashboard concept for The Post Oak Group, prepared as a technical case study. All accounts, people and transactions are fictional.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#193e2c',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${nunito.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
