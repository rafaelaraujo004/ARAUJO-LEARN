import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { SITE } from '@/lib/constants';
import { siteUrl } from '@/lib/site-url';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK'],
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: `${SITE.name} | ${SITE.slogan}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: SITE.name,
    title: `${SITE.name} | ${SITE.slogan}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0c1b2e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
