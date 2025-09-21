export interface UserProfile {
  id: string
  full_name: string
  created_at: string
  age?: number
  gender?: string
  profile_image_url?: string
}

export interface Airport {
  code: string
  name: string
  city: string
  country: string
}

export interface Trip {
  id: string
  user_id: string
  leaving_airport: string
  destination_airport: string
  travel_date: string
  departure_time?: string
  departure_timezone?: string
  landing_date?: string
  landing_time?: string
  landing_timezone?: string
  price?: number
  currency?: string
  negotiable?: boolean
  is_closed?: boolean
  closed_at?: string
  closed_reason?: string
  created_at: string
  user_profiles?: UserProfile
  leaving_airport_info?: Airport
  destination_airport_info?: Airport
}

export interface Location {
  id: string
  name: string
  county?: string
  state?: string
  country: string
  latitude?: number
  longitude?: number
}

export interface CarRide {
  id: string
  user_id: string
  from_location: string
  to_location: string
  from_latitude?: number
  from_longitude?: number
  to_latitude?: number
  to_longitude?: number
  departure_date_time: string
  price: number
  currency?: string
  negotiable?: boolean
  is_closed?: boolean
  closed_at?: string
  closed_reason?: string
  created_at: string
  user_profiles?: UserProfile
  intermediate_stops?: { address: string; latitude: number | null; longitude: number | null; }[]
}

export interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  message_content: string
  created_at: string
  is_read?: boolean
  message_type?: 'user' | 'system'
  sender?: UserProfile
  receiver?: UserProfile
}

export interface Conversation {
  id: string
  other_user_id: string
  other_user_name: string
  other_user?: UserProfile
  last_message: string
  last_message_time: string
  unread_count: number
}

export interface AuthState {
  user: any
  loading: boolean
}

export interface Review {
  id: string
  reviewer_name: string
  reviewer_email?: string
  rating: number
  review_content: string
  created_at: string
}

export interface RideConfirmation {
  id: string
  ride_id?: string
  trip_id?: string
  ride_owner_id: string
  passenger_id: string
  status: 'pending' | 'accepted' | 'rejected'
  confirmed_at?: string
  created_at: string
  updated_at: string
  user_profiles: UserProfile
  car_rides?: CarRide
  trips?: Trip
}