'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CourseCard from '@/components/CourseCard'
import Navigation from '@/components/Navigation'
import { useAuth } from '@/contexts/AuthContext'
import apiClient from '@/lib/axios'

interface Lesson { id: number; title: string; filename: string; file_type: string; explanation: string; content: string; created_at: string }

export default function LibraryPage() {
    const { user, loading: authLoading, logout } = useAuth()
    const router = useRouter()
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!authLoading) {
            loadLessons()
        }
    }, [authLoading, user])

    const loadLessons = async () => {
        if (!user) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            const response = await apiClient.get('/api/teachers/lessons')
            setLessons(response.data.lessons)
        } catch (error: any) {
            console.error('Error loading lessons:', error);
            if (error?.response?.status === 401) {
                setError('Authentication expired. Please log out and log back in.');
            } else {
                setError('Failed to load neural link (database sync error).');
            }
        } finally {
            setLoading(false)
        }
    }

    const deleteLesson = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this AI course?")) return;
        try {
            await apiClient.delete(`/api/teachers/lessons/${id}`)
            setLessons(prev => prev.filter(lesson => lesson.id !== id))
        } catch (error: any) {
            console.error('Error deleting lesson:', error);
            if (error?.response?.status === 401) {
                alert("Authentication expired. Please log out and log back in.");
            } else {
                alert("Error deleting lesson: " + (error?.response?.data?.detail || error.message));
            }
        }
    }

    return (
        <div className="min-h-screen bg-bg-page bg-grid relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyber-blue/5 rounded-full blur-[150px] animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-electric-green/5 rounded-full blur-[150px] animate-blob animation-delay-4000" />
            </div>

            <Navigation />
            <main className="relative z-10 max-w-7xl mx-auto px-6 py-16">
                
                <div className="text-center mb-16 animate-fade-in relative">
                    <p className="section-label mb-3">Neural Storage</p>
                    <h1 className="text-4xl md:text-6xl font-display font-black text-text-main mb-4 tracking-tight">
                        My Course Library
                    </h1>
                    <p className="text-text-muted text-lg">
                        {lessons.length === 0 ? 'Start by uploading material on the dashboard.' : `${lessons.length} computed courses available in your neural link.`}
                    </p>
                </div>

                {!loading && !authLoading && lessons.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-slide-up">
                        {lessons.map((lesson) => (
                            <div key={lesson.id} className="h-full">
                                <CourseCard
                                    id={lesson.id}
                                    title={lesson.title}
                                    explanation={lesson.explanation}
                                    created_at={lesson.created_at}
                                    onDelete={() => deleteLesson(lesson.id)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-2 border-cyber-blue/20" />
                            <div className="absolute inset-0 rounded-full border-t-2 border-cyber-blue spin-ring" />
                        </div>
                        <p className="text-cyber-blue font-bold text-sm tracking-widest uppercase animate-pulse">Syncing Database...</p>
                    </div>
                )}

                {!loading && !authLoading && lessons.length === 0 && (
                    <div className="card-glow p-12 text-center max-w-2xl mx-auto animate-fade-in border-dashed">
                        <div className="w-20 h-20 rounded-full glass flex items-center justify-center text-cyber-blue mx-auto mb-6 text-4xl">
                            📚
                        </div>
                        <h2 className="text-2xl font-bold text-text-main mb-2">Library Empty</h2>
                        <p className="text-text-muted mb-8">You haven't generated any AI courses yet.</p>
                        <Link href="/generate" className="btn-primary">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Create First Course
                        </Link>
                    </div>
                )}

                {error && (
                    <div className="mt-8 p-4 rounded-xl border border-neon-orange/40 bg-neon-orange/10 max-w-2xl mx-auto text-center shadow-glow-orange">
                        <p className="text-neon-orange text-sm font-bold uppercase tracking-wider">{error}</p>
                    </div>
                )}
            </main>
        </div>
    )
}