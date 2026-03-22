import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import AmbientBackground from '@/components/AmbientBackground'
import './globals.css'

export const metadata: Metadata = {
  title: 'iSchool — AI Learning Platform',
  description: 'Revolutionizing learning with AI-powered video tutors, smart quizzes, and instant explanations.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased text-text-main" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <AmbientBackground />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}