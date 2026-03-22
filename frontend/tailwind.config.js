/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // ── Earthy Surfaces ────────────────────────────────
                'bg-page':    'var(--bg-page)',
                'bg-card':    'var(--bg-card)',
                'bg-panel':   'var(--bg-panel)',
                'bg-glass':   'var(--bg-glass)',
                'bg-void':    '#0A0908',  // deepest dark for video bg

                // ── Earthy Accent Palette ──────────────────────────
                'sage':         'var(--color-sage)',
                'sage-light':   'var(--color-sage-light)',
                'terracotta':   'var(--color-terracotta)',
                'sand':         'var(--color-sand)',
                'earth-amber':  'var(--color-amber)',

                // ── Legacy compat (used in many components) ────────
                'cyber-blue':      'var(--color-sage)',       // remapped to sage
                'neon-orange':     'var(--color-terracotta)', // remapped to terracotta
                'electric-green':  'var(--color-sage)',       // remapped to sage
                'accent-cyan':     'var(--color-sage)',
                'accent-indigo':   'var(--color-sage)',
                'emerald':         'var(--color-sage)',
                'electric-blue':   'var(--color-sage)',

                // ── Text ───────────────────────────────────────────
                'text-main':  'var(--text-main)',
                'text-muted': 'var(--text-muted)',
                'text-faint': 'var(--text-faint)',

                // ── Borders ────────────────────────────────────────
                'border-dim':  'var(--border-dim)',
                'border-soft': 'var(--border-soft)',
            },

            fontFamily: {
                sans:    ['Inter', 'system-ui', 'sans-serif'],
                display: ['Montserrat', 'Inter', 'sans-serif'],
                mono:    ['ui-monospace', 'SFMono-Regular', 'monospace'],
            },

            backgroundImage: {
                'gradient-primary': 'linear-gradient(135deg, var(--color-terracotta) 0%, var(--color-sand) 100%)',
                'gradient-sage':    'linear-gradient(135deg, var(--color-sage) 0%, var(--color-sage-light) 100%)',
                'gradient-warm':    'linear-gradient(135deg, var(--color-terracotta) 0%, var(--color-amber) 100%)',
                'gradient-card':    'var(--gradient-card)',
            },

            boxShadow: {
                // Flat, warm shadows — no neon glow
                'card':           'var(--shadow-card)',
                'card-hover':     'var(--shadow-card-hover)',
                'soft-terra':     '0 2px 12px rgba(192, 107, 58, 0.2)',
                'soft-sage':      '0 2px 12px rgba(107, 127, 82, 0.2)',
                'soft-sand':      '0 2px 12px rgba(201, 169, 110, 0.2)',
                // Legacy names (kept so old JSX doesn't break, but values are soft)
                'glow-blue':      '0 2px 12px rgba(107, 127, 82, 0.25)',
                'glow-orange':    '0 2px 12px rgba(192, 107, 58, 0.25)',
                'glow-green':     '0 2px 12px rgba(107, 127, 82, 0.25)',
            },

            borderRadius: {
                'btn': '8px',
            },

            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
                'fadeIn':     'fadeIn 400ms ease forwards',
                'slideUp':    'slideUp 450ms ease forwards',
                'shimmer':    'shimmer 1.5s linear infinite',
            },

            keyframes: {
                fadeIn: {
                    from: { opacity: '0', transform: 'translateY(6px)' },
                    to:   { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(20px)' },
                    to:   { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%':   { backgroundPosition: '-200% center' },
                    '100%': { backgroundPosition:  '200% center' },
                },
            },
        },
    },
    plugins: [],
}
