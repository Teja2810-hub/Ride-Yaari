import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, authWithRetry } from '../utils/supabase'
import { UserProfile } from '../types'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isGuest: boolean
  setGuestMode: (isGuest: boolean) => void
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  sendEmailVerificationOtp: (email: string) => Promise<{ error: any }>
  verifyOTP: (email: string, token: string, type: 'email' | 'magiclink') => Promise<{ data: any, error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  const setGuestMode = (guestMode: boolean) => {
    setIsGuest(guestMode)
    if (guestMode) {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)

    if (!error && data && data.length > 0) {
      setUserProfile(data[0])
    } else {
      setUserProfile(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await authWithRetry.signIn(email, password)
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const data = await authWithRetry.signUp(email, password)
      
      // Create user profile after successful signup
      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              full_name: fullName
            })
          
          if (profileError) {
            console.error('Error creating user profile:', profileError)
          }
        } catch (profileError) {
          console.error('Error creating user profile:', profileError)
        }
      }
      
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const sendEmailVerificationOtp = async (email: string) => {
    try {
      await authWithRetry.sendEmailVerificationOtp(email)
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const verifyOTP = async (email: string, token: string, type: 'email' | 'magiclink') => {
    try {
      const { data } = await authWithRetry.verifyOTP(email, token, type)
      return { data, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    setIsGuest(false)
    await supabase.auth.signOut()
  }

  const value = {
    user,
    userProfile,
    loading,
    isGuest,
    setGuestMode,
    signIn,
    signUp,
    sendEmailVerificationOtp,
    verifyOTP,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}