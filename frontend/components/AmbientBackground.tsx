'use client'

import { usePathname } from 'next/navigation'

export default function AmbientBackground() {
  const pathname = usePathname()
  
  // Disable ambient background on lesson explanation pages
  if (pathname?.startsWith('/lessons/')) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <div 
        className="absolute -top-64 -left-64 w-[800px] h-[800px] rounded-full blur-[150px] animate-blob bg-cyan-500/10" 
      />
      <div 
        className="absolute top-1/3 -right-64 w-[600px] h-[600px] rounded-full blur-[130px] animate-blob animation-delay-2000 bg-orange-500/10" 
      />
      <div 
        className="absolute -bottom-64 left-1/4 w-[700px] h-[700px] rounded-full blur-[150px] animate-blob animation-delay-4000 bg-blue-500/10" 
      />
    </div>
  )
}
