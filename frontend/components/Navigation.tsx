'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'

export default function Navigation() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch (err) {
      console.error('Logout failed', err)
    }
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const initial = (user?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-bg-card/95 backdrop-blur-md shadow-card border-b border-border-dim'
        : 'bg-bg-page/95 backdrop-blur-md border-b border-border-dim'
    }`}>

      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* ── Logo ── */}
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5 group outline-none">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-105"
              style={{ background: 'var(--color-terracotta)' }}
            >
              <span className="text-white font-display font-bold text-sm">iS</span>
            </div>
            <span className="font-display font-bold text-lg tracking-wide text-text-main group-hover:text-terracotta transition-colors">
              iSchool
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 border-l border-border-dim pl-8">
            {[
              { href: '/courses',  label: 'My Library',    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
              { href: '/generate', label: 'Create Lesson', icon: 'M12 4v16m8-8H4' },
            ].map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-terracotta hover:bg-terracotta/8 transition-all duration-200 outline-none group"
              >
                <svg className="w-4 h-4 text-text-faint group-hover:text-terracotta transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Right side ── */}
        <div className="flex items-center gap-3">

          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-border-dim transition-all outline-none"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 group focus:outline-none"
              >
                <div className="hidden text-right md:block">
                  <p className="text-sm font-semibold text-text-main truncate max-w-[120px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                </div>
                <div className="relative">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all overflow-hidden border-2 group-hover:opacity-90"
                    style={{ background: 'var(--color-terracotta)', borderColor: 'var(--color-sand)' }}
                  >
                    {user.photoURL
                      ? <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                      : <span>{initial}</span>
                    }
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg-page"
                    style={{ background: 'var(--color-sage)' }}
                  />
                </div>
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-3 w-60 bg-bg-card rounded-xl shadow-card-hover border border-border-dim py-2 z-20 animate-fade-in">

                    <div className="px-4 py-3 mb-1">
                      <p className="text-sm font-semibold text-text-main truncate">{user.displayName || 'User'}</p>
                      <p className="text-xs text-text-muted truncate mt-0.5">{user.email}</p>
                    </div>

                    <div className="h-px bg-border-dim mx-3 mb-1" />

                    <Link
                      href="/contact"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:text-text-main hover:bg-border-dim/50 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-border-dim text-text-muted group-hover:text-text-main transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <span className="font-medium">Support</span>
                    </Link>

                    <div className="h-px bg-border-dim mx-3 mt-1 mb-1" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-950/30 text-red-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <span className="font-semibold">Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary px-5 py-2 text-sm">
              Get Started
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}