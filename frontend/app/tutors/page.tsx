'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import apiClient from '@/lib/axios'

interface SavedTutor { id: string; name: string; avatar: string; gender: 'male'|'female'; voice_id: string }

const EDGE_VOICES = [
  { id: 'en-US-GuyNeural', name: 'Guy (American)', gender: 'male', lang: 'English', tone: 'Professional' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher (American)', gender: 'male', lang: 'English', tone: 'Friendly' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (British)', gender: 'male', lang: 'English', tone: 'Energetic' },
  { id: 'ar-EG-ShakirNeural', name: 'Shakir (Egyptian)', gender: 'male', lang: 'Arabic', tone: 'Professional' },
  { id: 'es-ES-AlvaroNeural', name: 'Alvaro (Spanish)', gender: 'male', lang: 'Spanish', tone: 'Energetic' },
  
  { id: 'en-US-AriaNeural', name: 'Aria (American)', gender: 'female', lang: 'English', tone: 'Friendly' },
  { id: 'en-US-JennyNeural', name: 'Jenny (American)', gender: 'female', lang: 'English', tone: 'Energetic' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (British)', gender: 'female', lang: 'English', tone: 'Professional' },
  { id: 'ar-EG-SalmaNeural', name: 'Salma (Egyptian)', gender: 'female', lang: 'Arabic', tone: 'Friendly' },
  { id: 'es-ES-ElviraNeural', name: 'Elvira (Spanish)', gender: 'female', lang: 'Spanish', tone: 'Energetic' },
]

const PRESET_AVATARS = ['👨‍🏫', '👩‍🏫', '🤖', '🧑‍🚀', '🦄', '🎭', '👽', '🦊']

export default function TutorsPage() {
  const [tutors, setTutors] = useState<SavedTutor[]>([])
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male'|'female'>('male')
  const [voiceId, setVoiceId] = useState<string>('en-US-GuyNeural')
  const [avatar, setAvatar] = useState<string>('🤖')
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTutors()
  }, [])

  const loadTutors = () => {
    try {
      const stored = localStorage.getItem('iSchool_Tutors')
      if (stored) {
        setTutors(JSON.parse(stored))
      } else {
        const defaults: SavedTutor[] = [
          { id: 'default-male', name: 'Mr. Guy (Default)', avatar: '👨‍🏫', gender: 'male', voice_id: 'en-US-GuyNeural' },
          { id: 'default-female', name: 'Ms. Aria (Default)', avatar: '👩‍🏫', gender: 'female', voice_id: 'en-US-AriaNeural' }
        ]
        setTutors(defaults)
        localStorage.setItem('iSchool_Tutors', JSON.stringify(defaults))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveTutor = () => {
    if (!name.trim()) return alert('Please enter a name for your tutor.')
    const newTutor: SavedTutor = {
      id: `tutor-${Date.now()}`,
      name: name.trim(),
      avatar,
      gender,
      voice_id: voiceId
    }
    const updated = [...tutors, newTutor]
    setTutors(updated)
    localStorage.setItem('iSchool_Tutors', JSON.stringify(updated))
    setName('')
    setAvatar('🤖')
  }

  const handleDeleteTutor = (id: string) => {
    if (id.startsWith('default-')) return alert('Cannot delete default tutors.')
    if (!confirm('Delete this custom tutor?')) return
    const updated = tutors.filter(t => t.id !== id)
    setTutors(updated)
    localStorage.setItem('iSchool_Tutors', JSON.stringify(updated))
  }

  const playPreview = async (vId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (previewingId) return
    setPreviewingId(vId)
    try {
      const resp = await apiClient.post('/api/students/preview-voice', 
        { text: `Greetings! I am set to be your digital tutor.`, voice_id: vId },
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(resp.data)
      const audio = new Audio(url)
      audio.onended = () => {
        setPreviewingId(null)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        setPreviewingId(null)
        URL.revokeObjectURL(url)
      }
      await audio.play()
    } catch (err: any) {
      console.error(err)
      alert("Failed to preview voice: " + (err?.response?.data?.detail || err.message))
      setPreviewingId(null)
    }
  }

  const handleGenderChange = (g: 'male'|'female') => {
    setGender(g)
    // Auto pickup the first voice of that gender
    const defaultVoice = EDGE_VOICES.find(v => v.gender === g)
    if (defaultVoice) setVoiceId(defaultVoice.id)
  }

  return (
    <div className="min-h-screen bg-bg-page bg-grid relative overflow-hidden" suppressHydrationWarning>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-neon-orange/10 rounded-full blur-[150px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyber-blue/10 rounded-full blur-[150px] animate-blob animation-delay-2000" />
      </div>

      <Navigation />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12 animate-fade-in text-center max-w-2xl mx-auto">
          <p className="section-label mb-2 text-neon-orange">Neural Entity Configurator</p>
          <h1 className="text-4xl md:text-5xl font-display font-black text-text-main mb-4">
            Tutor Workshop
          </h1>
          <p className="text-text-muted text-lg">
            Design and configure custom AI teaching assistants. They are saved locally and fully integrated into the neural video generation pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ═══════════════════════════════════════════════════════
              LEFT: TUTOR CREATOR FORM
          ═══════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-6 animate-slide-up">
            <div className="card-glow p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-neon-orange to-amber-400" />
                <h2 className="text-sm font-bold tracking-widest uppercase text-neon-orange">Construct Entity</h2>
              </div>

              {/* Avatar Preview & Upload */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-2xl bg-panel border-2 border-border-dim shadow-inner flex items-center justify-center text-6xl overflow-hidden mb-4 group-hover:border-neon-orange/50 transition-colors">
                    {avatar.length > 10 ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span>{avatar}</span>}
                  </div>
                  <button suppressHydrationWarning onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 -right-2 w-8 h-8 rounded-full btn-orange flex items-center justify-center shadow-glow-orange opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </button>
                  <input suppressHydrationWarning type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                </div>
                
                {/* Minimal preset selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 w-full max-w-[280px] hide-scrollbar">
                  {PRESET_AVATARS.map(p => (
                    <button suppressHydrationWarning key={p} onClick={() => setAvatar(p)} className="text-2xl p-2 rounded-lg bg-panel border border-border-dim hover:bg-border-dim hover:scale-110 transition-all">
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Entity Name</label>
                  <input suppressHydrationWarning
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g. Professor Nova" 
                    className="input-styled focus:border-neon-orange focus:shadow-[0_0_15px_rgba(255,140,0,0.15)]"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Voice Neural Core</label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button suppressHydrationWarning
                      onClick={() => handleGenderChange('male')} 
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-2 ${gender === 'male' ? 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue shadow-glow-blue' : 'border-border-dim text-text-muted bg-panel hover:bg-white/5'}`}
                    >
                      <span className="text-xl">👨</span> Deep Voice (Male)
                    </button>
                    <button suppressHydrationWarning
                      onClick={() => handleGenderChange('female')} 
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-2 ${gender === 'female' ? 'border-electric-green bg-electric-green/10 text-electric-green shadow-glow-green' : 'border-border-dim text-text-muted bg-panel hover:bg-white/5'}`}
                    >
                      <span className="text-xl">👩‍🦰</span> Warm Voice (Female)
                    </button>
                  </div>
                  
                  {/* Select Specific Voice ID Categorized by Tone */}
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2 pt-2">Vocal Identity Signature</label>
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {['Professional', 'Friendly', 'Energetic'].map(tone => {
                      const voicesInTone = EDGE_VOICES.filter(v => v.gender === gender && v.tone === tone)
                      if (voicesInTone.length === 0) return null
                      return (
                        <div key={tone}>
                          <h4 className="text-[10px] font-bold tracking-[0.2em] text-cyber-blue uppercase mb-2 border-b border-border-dim pb-1">{tone}</h4>
                          <div className="flex flex-col gap-2">
                            {voicesInTone.map(voice => (
                              <div
                                key={voice.id}
                                onClick={() => setVoiceId(voice.id)}
                                className={`cursor-pointer flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all ${
                                  voiceId === voice.id
                                    ? (gender === 'male' ? 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue shadow-glow-blue' : 'border-electric-green bg-electric-green/10 text-electric-green shadow-glow-green')
                                    : 'border-border-dim bg-panel hover:border-text-faint hover:bg-white/5 text-text-muted'
                                }`}
                              >
                                <div className="flex flex-col gap-1">
                                  <span className={`font-bold ${voiceId === voice.id ? 'text-text-main' : ''}`}>{voice.name}</span>
                                  <span className="text-[9px] uppercase tracking-widest opacity-70">
                                    {voice.lang} • {voice.id.split('-').pop()}
                                  </span>
                                </div>
                                <button suppressHydrationWarning
                                  onClick={(e) => playPreview(voice.id, e)}
                                  disabled={previewingId !== null}
                                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-50 ${
                                    previewingId === voice.id 
                                      ? 'bg-neon-orange shadow-glow-orange text-white' 
                                      : 'bg-panel border border-border-dim hover:border-neon-orange hover:shadow-glow-orange hover:text-neon-orange'
                                  }`}
                                  title="Play Sample"
                                >
                                  {previewingId === voice.id ? (
                                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent spin-ring" />
                                  ) : (
                                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button suppressHydrationWarning onClick={handleSaveTutor} disabled={!name.trim()} className="w-full btn-orange py-3 px-4 shadow-glow-orange disabled:opacity-50">
                    Save Entity
                  </button>
                </div>
              </div>
            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════
              RIGHT: SAVED TUTORS ROSTER
          ═══════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="card-glow p-8 min-h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-cyber-blue to-indigo-400" />
                <h2 className="text-sm font-bold tracking-widest uppercase text-cyber-blue">Active Roster</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tutors.map(tutor => (
                  <div key={tutor.id} className="relative group bg-panel border border-border-dim rounded-2xl p-5 hover:border-cyber-blue/40 hover:shadow-[0_4px_20px_rgba(0,123,255,0.05)] transition-all">
                    
                    {!tutor.id.startsWith('default-') && (
                      <button suppressHydrationWarning onClick={() => handleDeleteTutor(tutor.id)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-bg-void border border-border-dim shadow-inner flex items-center justify-center text-3xl overflow-hidden shrink-0">
                        {tutor.avatar.length > 10 ? <img src={tutor.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span>{tutor.avatar}</span>}
                      </div>
                      <div>
                        {tutor.id.startsWith('default-') && (
                          <span className="text-[10px] font-bold text-cyber-blue uppercase tracking-wider mb-1 block">Default System</span>
                        )}
                        <h3 className="text-base font-bold text-text-main line-clamp-1">{tutor.name}</h3>
                        <p className={`text-[11px] font-bold tracking-widest mt-1 ${tutor.gender === 'male' ? 'text-cyber-blue' : 'text-electric-green'}`}>
                          {tutor.voice_id || (tutor.gender + ' core')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {tutors.length <= 2 && (
                  <div className="border border-dashed border-border-dim rounded-2xl p-5 flex flex-col items-center justify-center text-center opacity-50">
                    <div className="text-3xl mb-2">✨</div>
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Empty Slot</p>
                    <p className="text-[10px] text-text-faint mt-1">Construct a new entity on the left</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,255,65,0.3); border-radius: 2px; }
      `}</style>
    </div>
  )
}
