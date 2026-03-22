'use client'

import { useState } from 'react'
import apiClient from '@/lib/axios'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/Navigation'
import { useRouter } from 'next/navigation'

export default function GeneratePage() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !user) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)

    try {
      const response = await apiClient.post('/api/teachers/upload-lesson', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      })

      alert('Lesson uploaded and processed successfully!')
      router.push('/courses')
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.response?.data?.detail || 'Failed to upload lesson')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-page bg-grid relative overflow-hidden" suppressHydrationWarning>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyber-blue/15 rounded-full blur-[150px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-neon-orange/15 rounded-full blur-[150px] animate-blob animation-delay-4000" />
      </div>
      <Navigation />
      <main className="relative z-10 max-w-2xl mx-auto px-6 py-20 animate-slide-up">
        
        <div className="text-center mb-10">
          <p className="section-label mb-2 text-cyber-blue">Neural Processing Unit</p>
          <h1 className="text-4xl md:text-5xl font-display font-black text-text-main mb-4 tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Compute New Lesson
          </h1>
          <p className="text-text-muted text-lg">Upload course material to synthesize a new AI-generated curriculum.</p>
        </div>

        <div className="card-glow p-8 md:p-10 border border-border-dim shadow-[0_0_40px_rgba(0,163,255,0.15)] bg-bg-card relative">
          
          {/* Top Decorative Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-orange via-cyber-blue to-electric-green" />

          <form onSubmit={handleUpload} className="space-y-8 mt-2">
            {/* Lesson Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
                Module Designation
              </label>
              <input suppressHydrationWarning
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-4 rounded-xl border border-border-dim bg-bg-panel text-text-main focus:border-cyber-blue focus:shadow-[0_0_25px_rgba(0,163,255,0.4)] outline-none transition-all"
                placeholder="e.g. Advanced Quantum Mechanics"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
                Data Source (PDF)
              </label>
              <div className="relative border-2 border-dashed border-border-dim rounded-xl p-6 hover:border-electric-green hover:shadow-[0_0_30px_rgba(50,255,0,0.2)] transition-all bg-bg-panel group">
                <input suppressHydrationWarning
                  type="file" 
                  accept=".pdf"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-black dark:text-text-muted 
                    file:mr-4 file:py-3 file:px-6
                    file:rounded-xl file:border file:border-electric-green/50
                    file:text-xs file:font-bold file:uppercase file:tracking-wider
                    file:bg-electric-green/10 file:text-black dark:file:text-electric-green
                    hover:file:bg-electric-green/20 hover:file:shadow-[0_0_20px_rgba(50,255,0,0.4)]
                    cursor-pointer file:transition-all"
                />
              </div>
              {file && (
                <p className="mt-3 text-xs text-electric-green font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-electric-green shadow-[0_0_10px_#32FF00]"></span>
                  Neural Link Established: {file.name}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button suppressHydrationWarning
              type="submit" 
              disabled={uploading}
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-white transition-all ${
                uploading 
                  ? 'bg-bg-panel text-text-faint border border-border-dim cursor-not-allowed' 
                  : 'btn-primary shadow-[0_0_30px_rgba(0,163,255,0.6)] hover:shadow-[0_0_50px_rgba(0,163,255,1)] hover:border-white/50 border border-transparent'
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-text-faint border-t-transparent spin-ring" />
                  Synthesizing Matrix...
                </span>
              ) : 'Commence Computation'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}