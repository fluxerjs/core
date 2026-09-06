import type { Metadata } from 'next';
import { JetBrains_Mono, Source_Sans_3 } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import { Providers } from '@/components/Providers';
import { loadVersions } from '@/lib/api-docs';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
});
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Fluxer.js',
    template: '%s · Fluxer.js',
  },
  description: 'TypeScript SDK for Fluxer bots. Guides, SDK reference, and REST docs.',
  icons: { icon: '/favicon.svg' },
  verification: {
    google: '6trlbvjiKKRY2o294Vr5KJvciDt_y_OudSDkjsX5FtM',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { latest, versions } = loadVersions();
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <AppShell latest={latest} versions={versions}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
