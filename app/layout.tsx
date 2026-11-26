import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { LanguageProvider } from '@/lib/language-context';
import { FirebaseProvider } from '@/lib/firebase-context';
import { FirebaseErrorBoundary } from '@/components/FirebaseErrorBoundary';
import { ZoomLock } from '@/components/ZoomLock';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export const metadata: Metadata = {
  title: 'OpenSolver - QuizCraft',
  description: 'AI-powered step-by-step problem solver, timed practice exams, active-recall flashcards, and high-yield study summaries.',
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
            <FirebaseProvider>
              {children}
            </FirebaseProvider>
          </LanguageProvider>
        </FirebaseErrorBoundary>
      </body>
    </html>
  );
}
