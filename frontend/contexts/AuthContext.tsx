'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { initializeApp, getApps, getApp } from "firebase/app"; // Added
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User 
} from 'firebase/auth'
import { useRouter } from 'next/navigation'

// --- Firebase Initialization moved here ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app); 
// ------------------------------------------

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  signUp: async () => {},
  logout: async () => {},
  signInWithGoogle: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if (result?.user) router.push('/')
    }).catch((error) => console.error("Redirect Error:", error))

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [router])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
    router.push('/')
  }

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password)
    router.push('/')
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithRedirect(auth, provider)
  }

  const logout = async () => {
    await firebaseSignOut(auth)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}