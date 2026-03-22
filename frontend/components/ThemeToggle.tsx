'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-accent-cyan bg-gradient-blue-white dark:border-accent-cyan dark:bg-bg-card hover:shadow-md dark:hover:shadow-lg transition-all"
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
            {theme === 'dark' ? (
                <>
                    <svg className="w-5 h-5 text-accent-indigo" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                    <span className="text-xs text-text-main hidden sm:inline">Dark</span>
                </>
            ) : (
                <>
                    <svg className="w-5 h-5 text-accent-indigo" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.536l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.828-2.828a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm.464-4.536a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5.929 5.929a1 1 0 001.414-1.414L6.636 3.636a1 1 0 00-1.414 1.414l.707.707zm-2.828 2.828a1 1 0 001.414-1.414l-.707-.707A1 1 0 003.05 7.757l.707.707zM5.929 14.071a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zM10 19a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-accent-indigo hidden sm:inline">Light</span>
                </>
            )}
        </button>
    )
}
