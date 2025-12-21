import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextUIProviders } from '@/providers/nextui-provider';
import { MultiplayerProvider } from '@/contexts/MultiplayerContext';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Contexto - Word Guessing Game',
  description:
    'Find the secret word using context and semantic similarity. A fun word puzzle game inspired by Contexto.',
  keywords:
    'contexto, word game, puzzle, semantic similarity, context, guessing game',
  authors: [{ name: 'Contexto Multiplayer' }],
  creator: 'Contexto Multiplayer',
  publisher: 'Contexto Multiplayer',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://contexto-multiplayer.com'),
  openGraph: {
    title: 'Contexto - Word Guessing Game',
    description:
      'Find the secret word using context and semantic similarity. A fun word puzzle game inspired by Contexto.',
    url: 'https://contexto-multiplayer.com',
    siteName: 'Contexto Multiplayer',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Contexto - Word Guessing Game',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contexto - Word Guessing Game',
    description:
      'Find the secret word using context and semantic similarity. A fun word puzzle game inspired by Contexto.',
    images: ['/og-image.png'],
    creator: '@contexto_game',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark:bg-slate-900 dark:text-white`}
      >
        <NextUIProviders>
          <MultiplayerProvider>
            <div id="root">{children}</div>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                },
              }}
              richColors
            />
          </MultiplayerProvider>
        </NextUIProviders>
      </body>
    </html>
  );
}
