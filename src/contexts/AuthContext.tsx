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
  sendSignUpOtp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  verifySignUpOtp: (email: string, token: string, password: string, fullName: string) => Promise<{ error: any }>
  sendMagicLinkOtp: (email: string) => Promise<{ error: any }>
  verifyMagicLinkOtp: (email: string, token: string) => Promise<{ data: any, error: any }>
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
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setUserProfile(data)
      } else if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Profile not found, creating new profile for user:', userId)
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            full_name: 'New User',
            notification_preferences: {
              email_notifications: true,
              browser_notifications: true,
              ride_requests: true,
              ride_confirmations: true,
              messages: true,
              system_updates: true,
              marketing_emails: false,
              sound_enabled: true
            }
          })
          .select()
          .single()
        
        if (!createError && newProfile) {
          console.log('Profile created successfully:', newProfile)
          setUserProfile(newProfile)
        } else {
          console.error('Error creating user profile:', createError)
          setUserProfile(null)
        }
      } else {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
      }
    } catch (error) {
      console.error('Unexpected error in fetchUserProfile:', error)
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
      // This method is now deprecated - use sendSignUpOtp instead
      throw new Error('Please use the OTP verification flow for sign up')
    } catch (error: any) {
      return { error }
    }
  }

  const sendSignUpOtp = async (email: string, password: string, fullName: string) => {
    try {
      // Store signup data temporarily in localStorage for OTP verification
      const signupData = {
        email,
        password,
        fullName,
        timestamp: Date.now()
      }
      localStorage.setItem('rideyaari-signup-data', JSON.stringify(signupData))

      // Send OTP for email verification
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false, // Don't create user yet
          data: {
            full_name: fullName
          }
        }
      })
      
      if (error) throw error
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const verifySignUpOtp = async (email: string, token: string, password: string, fullName: string) => {
    try {
      // Verify the OTP first
      const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'email'
      })
      
      if (otpError) throw otpError

      // If OTP is valid, create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined // Disable email confirmation since we already verified
        }
      })
      
      if (error) throw error
      
      // Create user profile after successful signup
      if (data.user) {
        console.log('Creating user profile for:', data.user.id)
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            notification_preferences: {
              email_notifications: true,
              browser_notifications: true,
              ride_requests: true,
              ride_confirmations: true,
              messages: true,
              system_updates: true,
              marketing_emails: false,
              sound_enabled: true
            }
          })
        
        if (profileError) {
          console.error('Error creating user profile:', profileError)
          // Don't throw error here, let the user sign in and we'll create profile later
        }
      }
      
      // Clear temporary signup data
      localStorage.removeItem('rideyaari-signup-data')
      
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const sendMagicLinkOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false
        }
      })
      
      if (error) throw error
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const verifyMagicLinkOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'magiclink'
      })
      
      if (error) throw error
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
    sendSignUpOtp,
    verifySignUpOtp,
    sendMagicLinkOtp,
    verifyMagicLinkOtp,
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