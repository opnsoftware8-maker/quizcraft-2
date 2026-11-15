import type {Metadata} from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/language-context';

export const metadata: Metadata = {
  title: 'QuizCraft - Academic Problem Solver & Practice Exam Studio',
  description: 'AI-powered step-by-step problem solver, timed practice exams, active-recall flashcards, and high-yield study summaries.',
  openGraph: {
    title: 'QuizCraft - Academic Problem Solver & Practice Exam Studio',
    description: 'AI-powered step-by-step problem solver, timed practice exams, active-recall flashcards, and high-yield study summaries.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuizCraft - Academic Problem Solver & Practice Exam Studio',
    description: 'AI-powered step-by-step problem solver, timed practice exams, active-recall flashcards, and high-yield study summaries.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased font-sans bg-[#F8FAFC] text-[#1E293B]" suppressHydrationWarning>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
