import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey || supabaseUrl === '' || supabaseKey === '') {
  console.error('Supabase environment variables:', {
    VITE_SUPABASE_URL: supabaseUrl ? 'Set' : 'Missing',
    VITE_SUPABASE_ANON_KEY: supabaseKey ? 'Set' : 'Missing'
  })
  throw new Error('Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are properly set.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

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