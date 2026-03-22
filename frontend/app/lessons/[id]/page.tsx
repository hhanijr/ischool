'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import apiClient from '@/lib/axios'
import Navigation from '@/components/Navigation'
import MindMap from '@/components/MindMap'
import { useAuth } from '@/contexts/AuthContext'

interface Lesson { id: number; title: string; filename: string; explanation: string; content: string }
interface QuizQuestion { question: string; options: string[]; correct_answer: number; explanation?: string }
interface Chapter { title: string; content: string }
interface SavedTutor { id: string; name: string; avatar: string; gender: 'male'|'female'; voice_id?: string }

/* ── SVG Icon helper ───────────────────────────────────────── */
const Icon = ({ d, cls = 'w-5 h-5' }: { d: string; cls?: string }) => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
)

/* ── Skeleton loader block ──────────────────────────────────── */
const SkeletonBlock = ({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) => (
  <div className={`${h} ${w} rounded-md shimmer`} />
)

/* ── Sidebar tab IDs ────────────────────────────────────────── */
type SidebarTab = 'video' | 'quiz' | 'chat'

export default function LessonPage() {
  const params   = useParams()
  const id       = params?.id ? parseInt(params.id as string, 10) : null
  const { user, loading: authLoading } = useAuth()

  /* Core data */
  const [lesson, setLesson]                   = useState<Lesson | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [chapters, setChapters]               = useState<Chapter[]>([])
  const [completedTopics, setCompletedTopics] = useState(0)

  /* Sidebar state */
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [sidebarTab, setSidebarTab]           = useState<SidebarTab>('video')

  /* Video */
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [videoTasks, setVideoTasks] = useState<Record<number, {
     taskId: string;
     status: 'pending'|'queued'|'processing'|'completed'|'failed';
     videoUrl?: string;
     error?: string;
     queuePosition?: number;
     total?: number;
  }>>({})
  const [queueInfo, setQueueInfo] = useState<{ current: number; total: number; completed: number; isProcessing: boolean } | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<Record<number, boolean>>({})
  const [tutors, setTutors]                   = useState<SavedTutor[]>([])
  const [selectedTutorId, setSelectedTutorId] = useState<string>('default-male')
  const [gender, setGender]                   = useState<'male'|'female'>('male')
  const [voiceId, setVoiceId]                 = useState<string>('en-US-GuyNeural')
  const pollingRef                            = useRef<ReturnType<typeof setInterval> | null>(null)

  /* Quiz */
  const [quiz, setQuiz]                       = useState<QuizQuestion[] | null>(null)
  const [generatingQuiz, setGeneratingQuiz]   = useState(false)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})

  /* Chat */
  const [question, setQuestion]               = useState('')
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [answer, setAnswer]                   = useState<any>(null)

  /* ELI5 */
  const [eli5Cache, setEli5Cache]             = useState<Record<number, string>>({})
  const [loadingEli5, setLoadingEli5]         = useState<number | null>(null)
  const [openEli5, setOpenEli5]               = useState<Record<number, boolean>>({})

  /* Mind map */
  const [showMindMap, setShowMindMap]         = useState(false)
  const [mindMapData, setMindMapData]         = useState<any>(null)
  const [loadingMindMap, setLoadingMindMap]   = useState(false)
  const [mindMapError, setMindMapError]       = useState<string | null>(null)

  /* ── Load lesson ───────────────────────────────────────────── */
  useEffect(() => {
    if (!id || authLoading) return
    if (!user) { setLoading(false); return }
    const load = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get(`/api/students/lessons/${id}`)
        setLesson(res.data.lesson)
        const expl = res.data.lesson?.explanation || ''
        const sections = expl.split(/^##\s+/gm).filter((s: string) => s.trim())
        let parsed: Chapter[] = []
        for (const section of sections) {
          const lines = section.split('\n')
          const header = lines[0].trim()
          const content = lines.slice(1).join('\n').trim()
          if (header && content) parsed.push({ title: header, content })
        }
        if (parsed.length === 0) parsed = [{ title: 'Lesson Content', content: expl }]
        setChapters(parsed)
        const init: Record<number, boolean> = {}
        parsed.forEach((_, i) => { init[i] = true })
        setSelectedChapters(init)
        const stored = localStorage.getItem(`iSchool_Progress_${id}`)
        if (stored) setCompletedTopics(parseInt(stored, 10))

        // ── Restore video task state from DB ──────────────────────────────
        try {
          const taskRes = await apiClient.get(`/api/students/lessons/${id}/video-tasks`)
          const existing = taskRes.data.tasks as any[]
          if (existing.length > 0) {
            const restored: Record<number, any> = {}
            existing.forEach((t: any) => {
              if (t.chapter_index !== null && t.chapter_index !== undefined) {
                restored[t.chapter_index] = {
                  taskId: t.task_id,
                  status: t.status,
                  videoUrl: t.video_url ? `http://localhost:8000${t.video_url}` : undefined,
                  error: t.error,
                  queuePosition: t.queue_position,
                }
              }
            })
            if (Object.keys(restored).length > 0) {
              setVideoTasks(restored)
              setSidebarOpen(true)
              setSidebarTab('video')
              // Resume polling for any non-terminal tasks
              const active = existing.filter(t => t.status === 'pending' || t.status === 'queued' || t.status === 'processing')
              if (active.length > 0) {
                setGeneratingVideo(true)
                startPolling(id, active.map(t => ({ ch: t.chapter_index, id: t.task_id, total: existing.length })))
              }
            }
          }
        } catch { /* silently skip — video state restore is best-effort */ }
      } catch { setLesson(null) }
      finally { setLoading(false) }
    }
    load()
  }, [id, authLoading, user])

  /* ── Load tutors ───────────────────────────────────────────── */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('iSchool_Tutors')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.length > 0) {
          setTutors(parsed)
          setSelectedTutorId(parsed[0].id)
          setGender(parsed[0].gender)
          setVoiceId(parsed[0].voice_id || 'en-US-GuyNeural')
          return
        }
      }
    } catch {}
    const defaults: SavedTutor[] = [
      { id: 'default-male',   name: 'Mr. Alex',  avatar: '👨‍🏫', gender: 'male'   },
      { id: 'default-female', name: 'Ms. Aria', avatar: '👩‍🏫', gender: 'female' },
    ]
    setTutors(defaults)
    setSelectedTutorId('default-male')
    setGender('male')
    setVoiceId('en-US-GuyNeural')
  }, [])

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  const handleTutorSelect = (t: SavedTutor) => {
    setSelectedTutorId(t.id)
    setGender(t.gender)
    setVoiceId(t.voice_id || (t.gender === 'male' ? 'en-US-GuyNeural' : 'en-US-AriaNeural'))
  }

  /* ── Shared polling helper (used by both generate & restore) ── */
  const startPolling = (lessonId: number, activeTasks: { ch: number; id: string; total: number }[]) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    const total = activeTasks[0]?.total ?? activeTasks.length
    pollingRef.current = setInterval(async () => {
      let inFlight = 0
      let completedCount = 0
      let currentProcessingCh: number | null = null

      // We need to check all tasks to calculate overall progress
      await Promise.all(activeTasks.map(async (t) => {
        try {
          const poll = await apiClient.get(`/api/students/lessons/${lessonId}/video-status/${t.id}`)
          const { status, video_url, error, queue_position } = poll.data
          
          setVideoTasks(prev => {
            const existing = prev[t.ch]
            if (!existing || (existing.status === status && existing.videoUrl)) return prev
            return {
              ...prev,
              [t.ch]: {
                ...existing,
                status,
                videoUrl: status === 'completed' && video_url ? `http://localhost:8000${video_url}` : existing.videoUrl,
                error: error || undefined,
                queuePosition: queue_position,
              },
            }
          })

          if (status === 'completed') completedCount++
          if (status === 'processing') {
            inFlight++
            currentProcessingCh = t.ch + 1
          }
          if (status === 'pending' || status === 'queued') inFlight++
        } catch { inFlight++ }
      }))

      // Update overall queue info
      setQueueInfo({ 
        current: currentProcessingCh || (completedCount + 1), 
        total,
        completed: completedCount,
        isProcessing: currentProcessingCh !== null
      })

      if (inFlight === 0) {
        clearInterval(pollingRef.current!)
        pollingRef.current = null
        setGeneratingVideo(false)
        setQueueInfo(null)
      }
    }, 4000)
  }

  /* ── Generate video ────────────────────────────────────────── */
  const handleGenerateVideo = async () => {
    if (!lesson || !id) return
    const selectedIndices = Object.entries(selectedChapters).filter(([_, v]) => v).map(([k]) => parseInt(k))
    if (selectedIndices.length === 0) return alert('Please select at least one chapter.')
    setGeneratingVideo(true)
    setVideoTasks({})
    setQueueInfo(null)
    if (pollingRef.current) clearInterval(pollingRef.current)
    setSidebarOpen(true)
    setSidebarTab('video')
    try {
      const { data } = await apiClient.post(`/api/students/lessons/${lesson.id}/generate-video`, {
        chapters: selectedIndices, gender, voice_id: voiceId,
      })
      const total = data.tasks.length
      const newTasks: Record<number, any> = {}
      const activeTasks = data.tasks.map((t: any) => ({ ch: t.chapter_index, id: t.task_id, total }))
      for (const t of activeTasks) {
        newTasks[t.ch] = { taskId: t.id, status: 'queued', queuePosition: data.tasks.find((d: any) => d.task_id === t.id)?.queue_position }
      }
      setVideoTasks(newTasks)
      setQueueInfo({ current: 1, total, completed: 0, isProcessing: false })
      startPolling(id, activeTasks)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to start generation.'
      alert(msg)
      setGeneratingVideo(false)
      setQueueInfo(null)
    }
  }

  /* ── Delete/Cancel video task ──────────────────────────────── */
  const handleDeleteTask = async (chIdx: number, taskId: string) => {
    if (!id) return
    const confirmed = confirm('Are you sure you want to delete/cancel this video generation?')
    if (!confirmed) return

    try {
      await apiClient.delete(`/api/students/lessons/${id}/video-tasks/${taskId}`)
      setVideoTasks(prev => {
        const next = { ...prev }
        delete next[chIdx]
        return next
      })
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to delete task.'
      alert(msg)
    }
  }

  /* ── Generate quiz ─────────────────────────────────────────── */
  const handleGenerateQuiz = async () => {
    if (!lesson) return
    setGeneratingQuiz(true); setQuiz(null); setSelectedAnswers({})
    try {
      const res = await apiClient.post(`/api/teachers/lessons/${lesson.id}/generate-quiz`, { num_questions: 5 })
      if (res.data?.quiz) setQuiz(res.data.quiz)
    } catch { alert('Failed to generate quiz') }
    finally { setGeneratingQuiz(false) }
  }

  /* ── Ask question──────────────────────────────────────────── */
  const handleAskQuestion = async () => {
    if (!lesson || !question.trim()) return
    setLoadingQuestion(true)
    try {
      const res = await apiClient.post(`/api/students/ask-question`, { lesson_id: lesson.id, question: question.trim() })
      setAnswer(res.data)
    } catch { alert('Error asking question') }
    finally { setLoadingQuestion(false) }
  }

  /* ── ELI5 ──────────────────────────────────────────────────── */
  const handleEli5 = async (index: number, content: string) => {
    if (eli5Cache[index]) { setOpenEli5(p => ({ ...p, [index]: !p[index] })); return }
    setLoadingEli5(index)
    setOpenEli5(p => ({ ...p, [index]: true }))
    try {
      const res = await apiClient.post(`/api/students/lessons/${lesson?.id}/eli5`, { content })
      setEli5Cache(p => ({ ...p, [index]: res.data.explanation }))
    } catch { alert('Failed to generate ELI5.'); setOpenEli5(p => ({ ...p, [index]: false })) }
    finally { setLoadingEli5(null) }
  }

  /* ── Mind Map ──────────────────────────────────────────────── */
  const toggleMindMap = async () => {
    if (showMindMap) { setShowMindMap(false); return }
    setShowMindMap(true); setMindMapError(null)
    if (!mindMapData) {
      setLoadingMindMap(true)
      try {
        const res = await apiClient.get(`/api/students/lessons/${lesson?.id}/mindmap`)
        setMindMapData(res.data.mindmap)
      } catch { setMindMapError('Could not generate a concept map for this lesson.') }
      finally { setLoadingMindMap(false) }
    }
  }

  /* ── Derived ────────────────────────────────────────────────── */
  const hasCompletedVideos = Object.values(videoTasks).some(v => v.status === 'completed')
  // Split layout when video panel is open AND has content
  const splitView = sidebarOpen && sidebarTab === 'video' && Object.keys(videoTasks).length > 0

  /* ════════════════════════════════════════════════════════════════
     LOADING STATE
  ════════════════════════════════════════════════════════════════ */
  if (loading) return (
    <div className="min-h-screen bg-bg-page">
      <Navigation />
      <main className="max-w-4xl mx-auto px-5 py-10">
        <div className="mb-8 space-y-3">
          <SkeletonBlock h="h-3" w="w-24" />
          <SkeletonBlock h="h-8" w="w-3/4" />
          <SkeletonBlock h="h-3" w="w-40" />
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="mb-5 p-6 rounded-xl border border-border-dim space-y-3">
            <SkeletonBlock h="h-5" w="w-48" />
            <SkeletonBlock h="h-3" />
            <SkeletonBlock h="h-3" w="w-5/6" />
            <SkeletonBlock h="h-3" w="w-4/6" />
          </div>
        ))}
      </main>
    </div>
  )

  /* ════════════════════════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-bg-page">
      {/* Subtle background texture */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      <Navigation />

      {/* ── Sidebar Toggle Button (floating, right edge) ─────────── */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 px-2 py-4 rounded-l-xl border border-r-0 border-border-dim bg-bg-card shadow-card-hover transition-all hover:pr-3 group"
        aria-label="Toggle Learning Tools"
        title="Learning Tools"
      >
        {/* Sparkles-style icon */}
        <svg className="w-5 h-5 transition-colors" style={{ color: sidebarOpen ? 'var(--color-terracotta)' : 'var(--color-text-muted, #57534E)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
        <span
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ writingMode: 'vertical-rl', color: sidebarOpen ? 'var(--color-terracotta)' : 'var(--text-faint)' }}
        >
          Tools
        </span>
        {/* Active dot when video running */}
        {generatingVideo && (
          <span className="w-2 h-2 rounded-full mt-1" style={{ background: 'var(--color-sage)' }} />
        )}
      </button>

      <div className={`relative z-10 transition-all duration-300 ${sidebarOpen ? 'mr-80' : 'mr-0'}`}>
        <main className={`mx-auto px-5 py-10 transition-all duration-300 ${splitView ? 'max-w-full' : 'max-w-4xl'}`}>

          {/* ── Page Header ───────────────────────────── */}
          <div className="mb-8 animate-fade-in">
            <p className="section-label mb-2">Lesson</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-text-main leading-tight">
              {lesson?.title}
            </h1>
            <p className="text-text-muted text-sm mt-2 flex items-center gap-2">
              <span style={{ color: 'var(--color-sage)' }}>
                <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" cls="w-4 h-4" />
              </span>
              {lesson?.filename}
            </p>
          </div>

          {/* ── Split layout when video is ready ──────── */}
          <div className={splitView ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}>

            {/* ════════════════════════════════════════════
                LESSON CONTENT (always shown)
            ════════════════════════════════════════════ */}
            <div className="space-y-0">
              {/* Mind Map toggle */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={toggleMindMap}
                  className={`px-4 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                    showMindMap
                      ? 'text-white border-transparent'
                      : 'text-text-muted border-border-dim hover:border-border-soft hover:text-text-main'
                  }`}
                  style={showMindMap ? { background: 'var(--color-sage)', borderColor: 'var(--color-sage)' } : {}}
                >
                  <Icon d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" cls="w-3.5 h-3.5" />
                  {showMindMap ? 'Hide Concept Map' : 'Concept Map'}
                </button>
              </div>

              {/* Mind Map area */}
              {showMindMap && (
                <div className="mb-6 animate-fade-in">
                  {loadingMindMap ? (
                    <div className="h-72 rounded-xl border border-border-dim bg-bg-panel flex flex-col items-center justify-center gap-3">
                      <div className="w-full max-w-xs space-y-2 px-6">
                        <div className="w-full h-2 rounded shimmer" />
                        <div className="w-3/4 h-2 rounded shimmer" />
                        <div className="w-5/6 h-2 rounded shimmer" />
                      </div>
                      <p className="text-xs text-text-faint">Building concept map…</p>
                    </div>
                  ) : mindMapError ? (
                    <div className="h-48 rounded-xl border border-border-dim bg-bg-panel flex flex-col items-center justify-center p-6 text-center">
                      <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" cls="w-5 h-5 text-red-400 mb-2" />
                      <p className="text-sm text-text-muted">{mindMapError}</p>
                    </div>
                  ) : mindMapData ? (
                    <MindMap initialNodes={mindMapData.nodes} initialEdges={mindMapData.edges} />
                  ) : null}
                </div>
              )}

              {/* ── Chapter cards ──────────────────────────── */}
              {(lesson?.explanation || '').split(/^##\s+/gm).filter(s => s.trim()).map((section, i) => {
                const lines = section.split('\n')
                const title = lines[0].trim()
                const body  = lines.slice(1).join('\n').trim()
                const isCompleted = completedTopics > i
                return (
                  <article
                    key={i}
                    className={`mb-5 p-6 rounded-xl border transition-all duration-300 relative group ${
                      isCompleted
                        ? 'border-border-dim'
                        : 'border-border-dim hover:border-border-soft'
                    }`}
                    style={isCompleted ? { background: 'rgba(107,127,82,0.06)' } : { background: 'var(--bg-card)' }}
                  >
                    {/* Left accent bar */}
                    <div
                      className="absolute top-0 left-0 w-1 h-full rounded-l-xl transition-colors duration-300"
                      style={{ background: isCompleted ? 'var(--color-sage)' : 'var(--border-dim)' }}
                    />

                    <div className="flex items-start justify-between mb-4 pl-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold transition-all"
                          style={{
                            background: isCompleted ? 'var(--color-muted-green)' : 'transparent',
                            borderColor: isCompleted ? 'var(--color-sage)' : 'var(--border-soft)',
                            color: isCompleted ? 'var(--color-sage)' : 'var(--text-faint)',
                          }}
                        >
                          {i + 1}
                        </div>
                        <h3
                          className="text-base md:text-lg font-display font-semibold leading-snug"
                          style={{ color: isCompleted ? 'var(--text-main)' : 'var(--text-main)' }}
                        >
                          {title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {/* ELI5 button */}
                        <button
                          onClick={() => handleEli5(i, body)}
                          disabled={loadingEli5 === i}
                          className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                            openEli5[i]
                              ? 'text-white border-transparent'
                              : 'border-border-dim text-text-muted hover:border-border-soft hover:text-text-main'
                          }`}
                          style={openEli5[i] ? { background: 'var(--color-amber)', borderColor: 'var(--color-amber)' } : {}}
                          title="Explain Like I'm 5"
                        >
                          {loadingEli5 === i ? (
                            <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent spin-ring" />
                          ) : <span>🪄</span>}
                          <span className="hidden sm:inline">Simplify</span>
                        </button>

                        {/* Mark read checkbox */}
                        <button
                          onClick={() => {
                            const newCompleted = isCompleted ? i : i + 1
                            setCompletedTopics(newCompleted)
                            if (id) localStorage.setItem(`iSchool_Progress_${id}`, newCompleted.toString())
                          }}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'text-white border-transparent'
                              : 'border-border-dim text-transparent hover:border-border-soft'
                          }`}
                          style={isCompleted ? { background: 'var(--color-sage)', borderColor: 'var(--color-sage)' } : {}}
                          title={isCompleted ? 'Mark as unread' : 'Mark as read'}
                        >
                          <Icon d="M5 13l4 4L19 7" cls="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* ELI5 accordion */}
                    {openEli5[i] && eli5Cache[i] && (
                      <div
                        className="mb-4 mx-4 p-4 rounded-lg border animate-fade-in"
                        style={{ background: 'rgba(176,125,58,0.07)', borderColor: 'rgba(176,125,58,0.3)', borderLeft: '3px solid var(--color-amber)' }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-amber)' }}>
                          🪄 Simplified Explanation
                        </p>
                        <p className="text-sm text-text-main leading-relaxed">{eli5Cache[i]}</p>
                      </div>
                    )}

                    {/* Lesson body */}
                    <div className="text-text-muted text-base leading-relaxed whitespace-pre-wrap pl-4">
                      {body}
                    </div>
                  </article>
                )
              })}
            </div>

            {/* ════════════════════════════════════════════
                VIDEO PLAYER column (split view only)
            ════════════════════════════════════════════ */}
            {splitView && (
              <div className="lg:sticky lg:top-24 self-start space-y-4">
                <h3 className="font-display font-semibold text-text-main text-sm mb-3 flex items-center gap-2">
                  <span style={{ color: 'var(--color-terracotta)' }}>
                    <Icon d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14m-5 0H5a2 2 0 01-2-2V8a2 2 0 012-2h10v8z" cls="w-4 h-4" />
                  </span>
                  AI Video Lectures
                </h3>
                <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                  {Object.entries(videoTasks).map(([chIdxStr, vTask]) => {
                    const chIdx = parseInt(chIdxStr)
                    const chTitle = chapters[chIdx]?.title || `Chapter ${chIdx + 1}`
                    return (
                      <div key={chIdx} className="rounded-xl border border-border-dim bg-bg-card overflow-hidden animate-fade-in">
                        <div className="px-4 py-2.5 border-b border-border-dim flex justify-between items-center bg-bg-panel">
                          <span className="text-xs font-semibold text-text-main truncate pr-3">{chTitle}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase shrink-0 ${
                            vTask.status === 'pending'    ? 'badge-pending' :
                            vTask.status === 'queued'     ? 'badge-pending' :
                            vTask.status === 'processing' ? 'badge-processing' :
                            vTask.status === 'completed'  ? 'badge-completed' :
                            'badge-failed'
                          }`}>
                            {{ pending:'Queued', queued:'Queued', processing:'Rendering', completed:'Ready', failed:'Failed' }[vTask.status] ?? vTask.status}
                          </span>
                        </div>
                        {vTask.videoUrl ? (
                          <video src={vTask.videoUrl} controls className="w-full bg-bg-void" />
                        ) : (
                          <div className="aspect-video flex flex-col items-center justify-center bg-bg-panel">
                            {vTask.status === 'failed' ? (
                              <>
                                <Icon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" cls="w-5 h-5 text-red-400 mb-2" />
                                <p className="text-[10px] text-red-400 text-center px-4">{vTask.error || 'Generation failed'}</p>
                              </>
                            ) : (
                              <div className="w-full max-w-[120px] space-y-2">
                                <div className="h-1.5 w-full rounded-full bg-border-dim overflow-hidden">
                                  <div
                                    className="h-full rounded-full animate-pulse"
                                    style={{ width: vTask.status === 'processing' ? '65%' : '20%', background: 'var(--color-sage)' }}
                                  />
                                </div>
                                <p className="text-[9px] text-center text-text-faint uppercase tracking-widest">
                                  {vTask.status === 'processing' ? 'Rendering…' : 'Queued…'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SIDEBAR PANEL
      ════════════════════════════════════════════════════════════ */}
      {sidebarOpen && (
        <aside
          className="fixed right-0 top-0 h-full w-80 bg-bg-card border-l border-border-dim shadow-card-hover z-30 flex flex-col slide-in-right"
          style={{ paddingTop: '4rem' }} /* below nav */
        >
          {/* Close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 left-4 p-1.5 rounded-lg text-text-faint hover:text-text-main hover:bg-border-dim transition-all"
            aria-label="Close panel"
          >
            <Icon d="M6 18L18 6M6 6l12 12" cls="w-4 h-4" />
          </button>

          {/* Sidebar heading */}
          <div className="px-5 pt-4 pb-3 border-b border-border-dim">
            <h2 className="font-display font-semibold text-sm text-text-main">Learning Tools</h2>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b border-border-dim">
            {([
              { id: 'video', label: 'AI Video',      icon: 'M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14m-5 0H5a2 2 0 01-2-2V8a2 2 0 012-2h10v8z' },
              { id: 'quiz',  label: 'Quiz',           icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
              { id: 'chat',  label: 'AI Tutor',       icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
            ] as { id: SidebarTab; label: string; icon: string }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-all border-b-2 ${
                  sidebarTab === tab.id
                    ? 'border-terracotta text-terracotta'
                    : 'border-transparent text-text-faint hover:text-text-muted'
                }`}
                style={sidebarTab === tab.id ? { borderColor: 'var(--color-terracotta)', color: 'var(--color-terracotta)' } : {}}
              >
                <Icon d={tab.icon} cls="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">

            {/* ── VIDEO TAB ─────────────────────────────────── */}
            {sidebarTab === 'video' && (
              <div className="space-y-5 animate-fade-in">

                {/* ── Queue Status Banner ── */}
                {queueInfo && generatingVideo && (
                  <div
                    className="rounded-xl border p-3 animate-fade-in"
                    style={{ borderColor: 'var(--color-sand)', background: 'rgba(201,169,110,0.08)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-amber)' }}>
                        {queueInfo.isProcessing 
                          ? `Rendering Chapter ${queueInfo.current}` 
                          : `Preparing Chapter ${queueInfo.current}`
                        }
                        <span className="ml-2 text-text-faint normal-case font-medium">({queueInfo.completed}/{queueInfo.total} Done)</span>
                      </p>
                      <div className="w-3 h-3 rounded-full border-2 border-t-transparent spin-ring" style={{ borderColor: 'var(--color-amber)', borderTopColor: 'transparent' }} />
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border-dim overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.round((queueInfo.completed / queueInfo.total) * 100)}%`,
                          background: 'var(--color-amber)',
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-text-faint mt-1.5">
                      {queueInfo.isProcessing 
                        ? "Currently rendering talking head video. This usually takes 5-10 minutes per chapter."
                        : "Waiting for GPU resources..."
                      }
                    </p>
                  </div>
                )}

                {/* Video playlist */}
                {Object.keys(videoTasks).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(videoTasks).map(([chIdxStr, vTask]) => {
                      const chIdx = parseInt(chIdxStr)
                      const chTitle = chapters[chIdx]?.title || `Chapter ${chIdx + 1}`
                      return (
                        <div key={chIdx} className="rounded-lg border border-border-dim bg-bg-panel overflow-hidden">
                          <div className="px-3 py-2 flex justify-between items-center border-b border-border-dim">
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                              <button
                                onClick={() => handleDeleteTask(chIdx, vTask.taskId)}
                                className="p-1 rounded-md hover:bg-bg-void text-text-faint hover:text-red-400 transition-colors shrink-0"
                                title="Delete / Cancel"
                              >
                                <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" cls="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-medium text-text-muted truncate">{chTitle}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase shrink-0 ${
                              vTask.status === 'pending'    ? 'badge-pending' :
                              vTask.status === 'queued'     ? 'badge-pending' :
                              vTask.status === 'processing' ? 'badge-processing' :
                              vTask.status === 'completed'  ? 'badge-completed' :
                              'badge-failed'
                            }`}>
                              {{ pending:'Queued', queued:'Queued', processing:'Rendering', completed:'Ready', failed:'Failed' }[vTask.status] ?? vTask.status}
                            </span>
                          </div>
                          {vTask.videoUrl ? (
                            <video src={vTask.videoUrl} controls className="w-full" />
                          ) : (
                            <div className="aspect-video flex items-center justify-center bg-bg-panel">
                              {vTask.status === 'failed' ? (
                                <p className="text-[10px] text-red-400 text-center px-3">{vTask.error || 'Failed'}</p>
                              ) : (
                                <div className="w-24 space-y-1.5">
                                  <div className="h-1 w-full bg-border-dim rounded-full overflow-hidden">
                                    <div className="h-full animate-pulse rounded-full"
                                      style={{ width: vTask.status === 'processing' ? '60%' : '15%', background: 'var(--color-sage)' }} />
                                  </div>
                                  <p className="text-[9px] text-center text-text-faint uppercase tracking-widest">
                                    {vTask.status === 'processing' ? 'Rendering…' : 'Queued…'}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border-dim p-6 flex flex-col items-center text-center gap-2 mb-2">
                    <Icon d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-8 h-8 text-text-faint" />
                    <p className="text-xs text-text-faint">No videos yet. Configure and generate below.</p>
                  </div>
                )}

                {/* Tutor selector */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">1. Select Tutor</p>
                    <a href="/tutors" className="text-xs font-semibold transition-colors" style={{ color: 'var(--color-terracotta)' }}>Manage</a>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {tutors.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleTutorSelect(t)}
                        className="min-w-[80px] flex flex-col items-center gap-2 p-3 rounded-xl border transition-all"
                        style={{
                          borderColor: selectedTutorId === t.id ? 'var(--color-terracotta)' : 'var(--border-dim)',
                          background: selectedTutorId === t.id ? 'var(--color-muted-terra)' : 'var(--bg-panel)',
                        }}
                      >
                        <div
                          className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-2xl border-2"
                          style={{ borderColor: selectedTutorId === t.id ? 'var(--color-terracotta)' : 'var(--border-dim)' }}
                        >
                          {t.avatar.length > 5
                            ? <img src={t.avatar} alt="avatar" className="w-full h-full object-cover" />
                            : <span>{t.avatar}</span>
                          }
                        </div>
                        <p className="text-[10px] font-semibold text-center truncate w-full"
                          style={{ color: selectedTutorId === t.id ? 'var(--color-terracotta)' : 'var(--text-muted)' }}>
                          {t.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chapter checklist */}
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2.5">2. Select Chapters</p>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {chapters.map((ch, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all"
                        style={{
                          borderColor: selectedChapters[i] ? 'var(--color-sand)' : 'var(--border-dim)',
                          background: selectedChapters[i] ? 'rgba(201,169,110,0.08)' : 'transparent',
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                          style={{
                            borderColor: selectedChapters[i] ? 'var(--color-terracotta)' : 'var(--border-soft)',
                            background: selectedChapters[i] ? 'var(--color-terracotta)' : 'transparent',
                          }}
                        >
                          {selectedChapters[i] && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-medium truncate text-text-muted">{ch.title}</span>
                        <input type="checkbox" className="sr-only" checked={!!selectedChapters[i]}
                          onChange={() => setSelectedChapters(p => ({ ...p, [i]: !p[i] }))} />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerateVideo}
                  disabled={generatingVideo}
                  className="w-full btn-primary py-3 text-sm font-semibold"
                >
                  {generatingVideo ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white spin-ring" />Rendering…</>
                  ) : (
                    <><Icon d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4" />Generate Video</>
                  )}
                </button>
              </div>
            )}

            {/* ── QUIZ TAB ───────────────────────────────────── */}
            {sidebarTab === 'quiz' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Knowledge Check</p>
                  {!quiz && (
                    <button
                      onClick={handleGenerateQuiz}
                      disabled={generatingQuiz}
                      className="btn-primary py-1.5 px-3 text-xs"
                    >
                      {generatingQuiz ? 'Creating…' : 'Generate Quiz'}
                    </button>
                  )}
                </div>

                {generatingQuiz && (
                  <div className="space-y-2 py-4">
                    {[1,2,3].map(i => <SkeletonBlock key={i} h="h-12" />)}
                    <p className="text-xs text-text-faint text-center">Creating questions…</p>
                  </div>
                )}

                {!quiz && !generatingQuiz && (
                  <div className="text-center py-10 border border-dashed border-border-dim rounded-xl">
                    <Icon d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" cls="w-8 h-8 text-text-faint mx-auto mb-2" />
                    <p className="text-xs text-text-faint">Test your understanding with an AI-generated quiz.</p>
                  </div>
                )}

                {quiz && (
                  <div className="space-y-5">
                    {quiz.map((q, idx) => {
                      const selected = selectedAnswers[idx]
                      const isAnswered = !!selected
                      return (
                        <div key={idx} className="p-4 rounded-xl border border-border-dim bg-bg-panel">
                          <p className="font-semibold text-sm text-text-main mb-3">{idx + 1}. {q.question}</p>
                          <div className="flex flex-col gap-2">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect  = oIdx === q.correct_answer
                              const isSelected = selected === opt
                              let btnStyle = {}
                              let btnClass = 'p-2.5 rounded-lg text-left border text-xs font-medium transition-all flex items-center justify-between gap-2'
                              if (isAnswered) {
                                if (isCorrect)       { btnStyle = { background: 'rgba(107,127,82,0.12)', borderColor: 'var(--color-sage)', color: 'var(--color-sage)' } }
                                else if (isSelected) { btnStyle = { background: 'rgba(192,50,50,0.08)',  borderColor: '#C0392B',             color: '#C0392B' } }
                                else                 { btnStyle = { opacity: '0.45', borderColor: 'var(--border-dim)' } }
                              } else {
                                btnStyle = { borderColor: 'var(--border-dim)', color: 'var(--text-muted)' }
                              }
                              return (
                                <button
                                  key={oIdx}
                                  disabled={isAnswered}
                                  onClick={() => setSelectedAnswers(p => ({ ...p, [idx]: opt }))}
                                  className={btnClass}
                                  style={btnStyle}
                                >
                                  <span>{opt}</span>
                                  {isAnswered && isCorrect  && <span className="font-bold text-green-600">✓</span>}
                                  {isAnswered && isSelected && !isCorrect && <span className="font-bold text-red-500">✗</span>}
                                </button>
                              )
                            })}
                          </div>
                          {isAnswered && q.explanation && (
                            <p className="mt-3 text-xs text-text-faint italic">{q.explanation}</p>
                          )}
                        </div>
                      )
                    })}
                    <button
                      onClick={handleGenerateQuiz}
                      disabled={generatingQuiz}
                      className="w-full btn-sage py-2.5 text-sm mt-2"
                    >
                      <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" cls="w-4 h-4" />
                      New Quiz
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── CHAT TAB ─────────────────────────────────────── */}
            {sidebarTab === 'chat' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">AI Teaching Assistant</p>
                  <p className="text-xs text-text-faint">Ask anything about this lesson.</p>
                </div>

                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  className="input-styled resize-none text-sm"
                  placeholder="e.g. Can you summarize the key concepts?"
                  rows={4}
                />
                <button
                  onClick={handleAskQuestion}
                  disabled={loadingQuestion || !question.trim()}
                  className="w-full btn-primary py-2.5 text-sm"
                >
                  {loadingQuestion ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white spin-ring" />Thinking…</>
                  ) : (
                    <><Icon d="M13 10V3L4 14h7v7l9-11h-7z" cls="w-4 h-4" />Ask AI Tutor</>
                  )}
                </button>

                {answer && (
                  <div
                    className="p-4 rounded-xl border animate-fade-in"
                    style={{ background: 'var(--color-muted-green)', borderColor: 'rgba(107,127,82,0.3)' }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-sage)' }}>Response</p>
                    <p className="text-sm text-text-main leading-relaxed">{answer.answer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}