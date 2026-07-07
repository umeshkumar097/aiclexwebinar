import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Zonvo — Enterprise Semi-Live Webinar Platform',
    template: '%s | Zonvo',
  },
  description:
    'The most powerful semi-live webinar platform for coaches, educators, and businesses. Host webinars with pre-recorded content and go live whenever you want.',
  keywords: ['webinar', 'semi-live webinar', 'online events', 'hybrid webinar', 'B2B SaaS'],
  authors: [{ name: 'Zonvo' }],
  openGraph: {
    title: 'Zonvo — Enterprise Semi-Live Webinar Platform',
    description: 'Host powerful webinars with hybrid live capabilities.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Zonvo',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
