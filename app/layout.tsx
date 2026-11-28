import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { LanguageProvider } from '@/lib/language-context';
import { FirebaseProvider } from '@/lib/firebase-context';
import { FirebaseErrorBoundary } from '@/components/FirebaseErrorBoundary';
import { ZoomLock } from '@/components/ZoomLock';
import { PwaManager } from '@/components/PwaManager';

export const viewport: Viewport = {
  themeColor: '#FAF9F5',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export const metadata: Metadata = {
  applicationName: 'QuizCraft',
  title: 'OpenSolver - QuizCraft',
  description: 'AI-powered step-by-step problem solver, timed practice exams, active-recall flashcards, and high-yield study summaries.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'QuizCraft',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'OpenSolver - QuizCraft',
    description: 'AI-powered step-by-step problem solver, timed practice exams, active-recall flashcards, and high-yield study summaries.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenSolver - QuizCraft',
    description: 'AI-powered step-by-step problem solver, timed practice exams, active-recall flashcards, and high-yield study summaries.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans bg-[#FAF9F5] text-[#1F1E1D]" suppressHydrationWarning>
        <ZoomLock />
        <FirebaseErrorBoundary>
          <LanguageProvider>
            <PwaManager />
            <FirebaseProvider>
              {children}
            </FirebaseProvider>
          </LanguageProvider>
        </FirebaseErrorBoundary>
      </body>
    </html>
  );
}
