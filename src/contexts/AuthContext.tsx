import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, authWithRetry } from '../utils/supabase'
import { UserProfile } from '../types'
import { getDefaultAvatarUrl } from '../utils/avatarHelpers'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  isGuest: boolean
  setGuestMode: (isGuest: boolean) => void
  refreshUserProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  sendSignUpOtp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  verifySignUpOtp: (email: string, token: string, password: string, fullName: string) => Promise<{ error: any }>
  sendMagicLinkOtp: (email: string) => Promise<{ error: any }>
  verifyMagicLinkOtp: (email: string, token: string) => Promise<{ data: any, error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  sendPasswordReset: (email: string) => Promise<{ error: any }>
  verifyPasswordReset: (email: string, token: string, newPassword: string) => Promise<{ error: any }>
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
        
        // Get user email to extract name for avatar generation
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const userEmail = authUser?.email || ''
        // Try to get name from user metadata first, then fall back to email
        const defaultName = authUser?.user_metadata?.full_name || 
                           authUser?.user_metadata?.name || 
                           userEmail.split('@')[0] || 
                           'New User'
        
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .upsert({
            id: userId,
            full_name: defaultName,
            profile_image_url: getDefaultAvatarUrl('default', defaultName),
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

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
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
      // Try OTP first, fallback to direct signup if OTP is disabled
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
      } catch (otpError: any) {
        // If OTP is disabled, fall back to direct signup
        if (otpError.message?.includes('otp_disabled') || otpError.message?.includes('Signups not allowed for otp')) {
          console.log('OTP disabled, falling back to direct signup')
          
          // Clear any stored signup data since we're doing direct signup
          localStorage.removeItem('rideyaari-signup-data')
          
          // Directly create the user account
          const { data, error: signupError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName
              }
            }
          })
          
          if (signupError) throw signupError
          
          // Create user profile with default avatar after successful signup
          if (data.user) {
            try {
              const defaultAvatarUrl = getDefaultAvatarUrl('default', fullName)
              
              const { error: profileError } = await supabase
                .from('user_profiles')
                .upsert({
                  id: data.user.id,
                  full_name: fullName,
                  profile_image_url: defaultAvatarUrl,
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
                console.error('Error creating user profile during signup:', profileError)
              }
            } catch (profileError) {
              console.error('Error creating user profile during signup:', profileError)
            }
          }
          
          return { error: null, skipOtp: true }
        } else {
          throw otpError
        }
      }
      
    } catch (error: any) {
      return { error }
    }
  }

  const verifySignUpOtp = async (email: string, token: string, password: string, fullName: string) => {
    try {
      // If OTP is valid, create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation since we already verified
          data: {
            full_name: fullName
          }
        }
      })
      
      if (error) throw error
      
      // Create user profile with default avatar after successful signup
      if (data.user) {
        try {
          const defaultAvatarUrl = getDefaultAvatarUrl('default', fullName)
          
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName,
              profile_image_url: defaultAvatarUrl,
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
            console.error('Error creating user profile during signup:', profileError)
            // Don't fail the signup if profile creation fails, but log it
          } else {
            console.log('User profile created successfully for:', fullName)
          }
        } catch (profileError) {
          console.error('Error creating user profile during signup:', profileError)
          // Don't fail the signup if profile creation fails
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
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            shouldCreateUser: false
          }
        })
        
        if (error) throw error
        return { error: null }
      } catch (otpError: any) {
        // If OTP is disabled, return a helpful error message
        if (otpError.message?.includes('otp_disabled') || otpError.message?.includes('Signups not allowed for otp')) {
          throw new Error('Magic link sign-in is currently unavailable. Please use email and password to sign in.')
        } else {
          throw otpError
        }
      }
      
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

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) throw error
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const signOut = async () => {
    setIsGuest(false)
    await supabase.auth.signOut()
  }

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) throw error
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const verifyPasswordReset = async (accessToken: string, refreshToken: string, newPassword: string) => {
    try {
      // Set the session with the tokens from the password reset link
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (sessionError) throw sessionError
      
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) throw updateError
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const verifyPasswordReset = async (email: string, token: string, newPassword: string) => {
    try {
      // Verify the OTP token for password reset
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'recovery'
      })
      
      if (verifyError) throw verifyError
      
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) throw updateError
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    isGuest,
    setGuestMode,
    refreshUserProfile,
    signIn,
    signUp,
    sendSignUpOtp,
    verifySignUpOtp,
    sendMagicLinkOtp,
    verifyMagicLinkOtp,
    signInWithGoogle,
    sendPasswordReset,
    verifyPasswordReset,
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