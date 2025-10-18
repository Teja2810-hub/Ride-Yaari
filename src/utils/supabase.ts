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
        throw error
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
        throw error
      }
      
      return data
    })
  },
  
  sendSignUpOtp: async (email: string) => {
    return retrySupabaseOperation(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        }
      })
      
      if (error) {
        throw error
      }
      
      return { error: null }
    })
  },
  
  sendMagicLinkOtp: async (email: string) => {
    return retrySupabaseOperation(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        }
      })
      
      if (error) {
        throw error
      }
      
      return { error: null }
    })
  },
  
  verifySignUpOtp: async (email: string, token: string) => {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'email'
      })
      
      if (error) {
        throw error
      }
      
      return { data, error: null }
    })
  },
  
  verifyMagicLinkOtp: async (email: string, token: string) => {
    return retrySupabaseOperation(async () => {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'email'
      })
      
      if (error) {
        throw error
      }
      
      return { data, error: null }
    })
  },
  
  sendPasswordReset: async (email: string) => {
    return retrySupabaseOperation(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) {
        throw error
      }
      
      return { error: null }
    })
  },
  
  verifyPasswordReset: async (email: string, token: string, newPassword: string) => {
    return retrySupabaseOperation(async () => {
      // First verify the OTP token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'recovery'
      })
      
      if (verifyError) {
        throw verifyError
      }
      
      // Then update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) {
        throw updateError
      }
      
      return { error: null }
    })
  },
  
  signOut: async () => {
    return retrySupabaseOperation(async () => {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
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
          departure_timezone: string | null
          landing_date: string | null
          landing_time: string | null
          landing_timezone: string | null
          price: number | null
          currency: string | null
          negotiable: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          leaving_airport: string
          destination_airport: string
          travel_date: string
          departure_time?: string | null
          departure_timezone?: string | null
          landing_date?: string | null
          landing_time?: string | null
          landing_timezone?: string | null
          price?: number | null
          currency?: string | null
          negotiable?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          leaving_airport?: string
          destination_airport?: string
          travel_date?: string
          departure_time?: string | null
          departure_timezone?: string | null
          landing_date?: string | null
          landing_time?: string | null
          landing_timezone?: string | null
          price?: number | null
          currency?: string | null
          negotiable?: boolean | null
          created_at?: string
        }
      }
      car_rides: {
        Row: {
          id: string
          user_id: string
          from_location: string
          from_latitude: number | null
          from_longitude: number | null
          to_location: string
          to_latitude: number | null
          to_longitude: number | null
          departure_date_time: string
          price: number
          currency: string | null
          negotiable: boolean | null
          intermediate_stops: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          from_location: string
          from_latitude?: number | null
          from_longitude?: number | null
          to_location: string
          to_latitude?: number | null
          to_longitude?: number | null
          departure_date_time: string
          price: number
          currency?: string | null
          negotiable?: boolean | null
          intermediate_stops?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          from_location?: string
          from_latitude?: number | null
          from_longitude?: number | null
          to_location?: string
          to_latitude?: number | null
          to_longitude?: number | null
          departure_date_time?: string
          price?: number
          currency?: string | null
          negotiable?: boolean | null
          intermediate_stops?: string | null
          created_at?: string
        }
      }
      ride_confirmations: {
        Row: {
          id: string
          ride_id: string
          trip_id: string | null
          ride_owner_id: string
          passenger_id: string
          status: string
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ride_id: string
          trip_id?: string | null
          ride_owner_id: string
          passenger_id: string
          status: string
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ride_id?: string
          trip_id?: string | null
          ride_owner_id?: string
          passenger_id?: string
          status?: string
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          message_content: string
          is_read: boolean | null
          message_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          message_content: string
          is_read?: boolean | null
          message_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          message_content?: string
          is_read?: boolean | null
          message_type?: string | null
          created_at?: string
        }
      }
    }
  }
}