'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useAuth } from '@/contexts/AuthContext'

const teamMembers = [
  { name: 'Yousef Hatem',    role: 'Full-Stack Developer', avatar: '👨‍💻', accent: 'terra' },
  { name: 'Mohamed Hani',    role: 'Creative Lead',        avatar: '🎨',  accent: 'sage'  },
  { name: 'Hla Hani',        role: 'Product Designer',     avatar: '👩‍🎨', accent: 'sand'  },
  { name: 'Nagwa Aboelfotoh',role: 'Operations Lead',      avatar: '👩‍💼', accent: 'terra' },
  { name: 'Merna Aziz',      role: 'AI Researcher',        avatar: '🧠',  accent: 'sage'  },
  { name: 'Alaa Mohamed',    role: 'Backend Specialist',   avatar: '⚙️',  accent: 'sand'  },
]

const techStack = [
  { name: 'Next.js',   icon: '⚛️',  desc: 'React Framework' },
  { name: 'FastAPI',   icon: '🚀',  desc: 'Python Backend'  },
  { name: 'Groq AI',   icon: '🧠',  desc: 'LLM Engine'      },
  { name: 'SadTalker', icon: '🎭',  desc: 'Avatar Video'    },
  { name: 'Edge TTS',  icon: '🎙️', desc: 'Neural Speech'   },
]

const features = [
  {
    icon: '⚡',
    title: 'Instant Generation',
    body: 'Convert documents into structured lessons in seconds using fast LLM inference with Groq AI.',
    accent: 'terra',
  },
  {
    icon: '🧠',
    title: 'Contextual Q&A',
    body: 'RAG-powered AI answers questions with hyper-accuracy using your own uploaded curriculum.',
    accent: 'sage',
  },
  {
    icon: '🎬',
    title: 'AI Video Tutors',
    body: 'Generate synchronized talking-head video avatars with SadTalker and realistic neural TTS.',
    accent: 'sand',
  },
]

const accentStyle = {
  terra: { color: 'var(--color-terracotta)', bg: 'var(--color-muted-terra)', border: 'var(--color-terracotta)' },
  sage:  { color: 'var(--color-sage)',       bg: 'var(--color-muted-green)', border: 'var(--color-sage)' },
  sand:  { color: 'var(--color-sand)',       bg: 'var(--color-muted-terra)', border: 'var(--color-sand)' },
}

function WorkspaceContent() {
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="min-h-screen bg-bg-page relative overflow-x-hidden">
      {/* Subtle background grid */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid" />
      </div>

      <Navigation />

      <main className="relative z-10 max-w-6xl mx-auto px-5 py-20 space-y-24">

        {/* ══ HERO ══ */}
        <section className="text-center space-y-7 animate-fade-in pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-soft bg-bg-card text-text-muted text-xs font-semibold tracking-wide mb-2">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--color-sage)' }} />
            iSchool Genesis Core
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold text-text-main leading-[1.08] max-w-4xl mx-auto">
            Transform Documents into{' '}
            <span
              className="relative"
              style={{
                background: 'linear-gradient(135deg, var(--color-terracotta) 0%, var(--color-sand) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Living Lessons
            </span>
          </h1>

          <p className="text-text-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Create AI-driven video lectures, generate dynamic quizzes, and bring your content to life with state-of-the-art neural generation.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
            <Link href="/courses" className="btn-primary px-7 py-3 text-base">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Browse Academy
            </Link>
            <Link href="/tutors" className="btn-sage px-7 py-3 text-base">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Configure Tutors
            </Link>
          </div>
        </section>

        {/* ══ TECH STACK PILLS ══ */}
        <section className="flex flex-wrap justify-center gap-3 animate-slide-up">
          {techStack.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-text-muted bg-bg-card border border-border-dim hover:border-border-soft hover:text-text-main transition-all"
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.name}</span>
              <span className="text-text-faint text-xs pl-2 border-l border-border-dim hidden md:inline">{t.desc}</span>
            </div>
          ))}
        </section>

        {/* ══ FEATURES ══ */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slide-up max-w-5xl mx-auto w-full">
          {features.map((f, i) => {
            const a = accentStyle[f.accent as keyof typeof accentStyle]
            return (
              <div
                key={i}
                className="card-glow p-7 group hover:-translate-y-1 transition-all duration-300"
                style={{ '--hover-border': a.border } as React.CSSProperties}
                onMouseEnter={e => (e.currentTarget.style.borderColor = a.border)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-5 transition-transform group-hover:scale-105"
                  style={{ background: a.bg, border: `1px solid ${a.border}` }}
                >
                  {f.icon}
                </div>
                <h4 className="font-display font-semibold text-lg mb-2" style={{ color: a.color }}>{f.title}</h4>
                <p className="text-sm text-text-muted leading-relaxed">{f.body}</p>
              </div>
            )
          })}
        </section>

        {/* ══ TEAM ══ */}
        <section className="animate-slide-up pt-6">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Architects of iSchool</p>
            <h2 className="text-3xl font-display font-bold text-text-main">The Engineering Team</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {teamMembers.map((m, i) => {
              const a = accentStyle[m.accent as keyof typeof accentStyle]
              return (
                <div
                  key={i}
                  className="card-glow p-5 text-center group hover:-translate-y-1 transition-all duration-300 cursor-default"
                  onMouseEnter={e => (e.currentTarget.style.borderColor = a.border)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                >
                  <div
                    className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-2xl mb-3 transition-transform group-hover:scale-105"
                    style={{ background: a.bg, border: `1px solid ${a.border}` }}
                  >
                    {m.avatar}
                  </div>
                  <h3 className="font-semibold text-sm text-text-main leading-snug">{m.name}</h3>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-1.5" style={{ color: a.color }}>{m.role}</p>
                </div>
              )
            })}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border-dim mt-20 py-8 text-center text-text-faint text-xs">
        <p>© {new Date().getFullYear()} iSchool Genesis Core — Built with ❤️ for Education</p>
      </footer>
    </div>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-1.5 rounded-full shimmer" style={{ width: '120px' }} />
          <div className="w-8 h-1.5 rounded-full shimmer" style={{ width: '80px' }} />
        </div>
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  )
}