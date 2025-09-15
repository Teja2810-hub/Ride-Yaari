import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey || supabaseUrl === '' || supabaseKey === '') {
  console.error('Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
    VITE_SUPABASE_ANON_KEY: supabaseKey ? 'Set' : 'Missing'
  })
  throw new Error('Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are properly set.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'rideshare-app'
    }
  }
})

// Helper function to retry Supabase operations with exponential backoff
export async function retrySupabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Don't retry on client errors (4xx) or auth errors
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`Supabase operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, error)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Enhanced auth methods with retry logic
export const authWithRetry = {
  signUp: async (email: string, password: string) => {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) {
        throw new Error(`Signup failed: ${error.message}`)
      }
      
      return data
    })
  },
  
  signIn: async (email: string, password: string) => {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        throw new Error(`Login failed: ${error.message}`)
      }
      
      return data
    })
  },
  
  sendEmailVerificationOtp: async (email: string) => {
    return retrySupabaseOperation(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        throw new Error(`Failed to send verification email: ${error.message}`)
      }
      
      return { error: null }
    })
  },
  
  verifyOTP: async (email: string, token: string, type: 'email' | 'magiclink') => {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: type
      })
      
      if (error) {
        throw new Error(`Failed to verify code: ${error.message}`)
      }
      
      return { data, error: null }
    })
  },
  
  signOut: async () => {
    return retrySupabaseOperation(async () => {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw new Error(`Logout failed: ${error.message}`)
      }
    })
  }
}

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          full_name: string
          created_at: string
          age: number | null
          gender: string | null
          profile_image_url: string | null
        }
        Insert: {
          id: string
          full_name: string
          created_at?: string
          age?: number | null
          gender?: string | null
          profile_image_url?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          created_at?: string
          age?: number | null
          gender?: string | null
          profile_image_url?: string | null
        }
      }
      trips: {
        Row: {
          id: string
          user_id: string
          leaving_airport: string
          destination_airport: string
          travel_date: string
          departure_time: string | null
          landing_date: string | null
          landing_time: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          leaving_airport: string
          destination_airport: string
          travel_date: string
          departure_time?: string | null
          landing_date?: string | null
          landing_time?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          leaving_airport?: string
          destination_airport?: string
          travel_date?: string
          departure_time?: string | null
          landing_date?: string | null
          landing_time?: string | null
          created_at?: string
        }
      }
      car_rides: {
        Row: {
          id: string
          user_id: string
          from_location: string
          to_location: string
          departure_date_time: string
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          from_location: string
          to_location: string
          departure_date_time: string
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          from_location?: string
          to_location?: string
          departure_date_time?: string
          price?: number
          created_at?: string
        }
      }
      ride_confirmations: {
        Row: {
          id: string
          ride_id: string
          user_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          ride_id: string
          user_id: string
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          ride_id?: string
          user_id?: string
          status?: string
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          message_content: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          message_content: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          message_content?: string
          created_at?: string
        }
      }
    }
  }
}