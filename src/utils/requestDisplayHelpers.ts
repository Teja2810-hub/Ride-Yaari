import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'
import { RideRequest, TripRequest } from '../types'
import { formatDateSafe } from './dateHelpers'

/**
 * Get ride requests that match search criteria for display in FindRide
 */
export const getMatchingRideRequests = async (
  departureLocation?: string,
  destinationLocation?: string,
  travelDate?: string,
  travelMonth?: string,
  searchByMonth: boolean = false
): Promise<RideRequest[]> => {
  return retryWithBackoff(async () => {
    let query = supabase
      .from('ride_requests')
      .select(`
        *,
        user_profiles!ride_requests_passenger_id_fkey (
          id,
          full_name,
          profile_image_url
        )
      `)
      .eq('is_active', true)

    // Filter by location if provided
    if (departureLocation) {
      query = query.ilike('departure_location', `%${departureLocation}%`)
    }
    if (destinationLocation) {
      query = query.ilike('destination_location', `%${destinationLocation}%`)
    }

    // Filter by date
    if (searchByMonth && travelMonth) {
      // For month search, match requests that include this month
      query = query.or(`request_month.eq.${travelMonth},multiple_dates.cs.{${travelMonth}-01}`)
    } else if (!searchByMonth && travelDate) {
      // For specific date search
      query = query.or(`specific_date.eq.${travelDate},multiple_dates.cs.{${travelDate}}`)
    }

    // Only show future requests
    const today = new Date().toISOString().split('T')[0]
    query = query.or(`specific_date.gte.${today},expires_at.gte.${new Date().toISOString()}`)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  })
}

/**
 * Get trip requests that match search criteria for display in FindTrip
 */
export const getMatchingTripRequests = async (
  departureAirport?: string,
  destinationAirport?: string,
  travelDate?: string,
  travelMonth?: string,
  searchByMonth: boolean = false
): Promise<TripRequest[]> => {
  return retryWithBackoff(async () => {
    let query = supabase
      .from('trip_requests')
      .select(`
        *,
        user_profiles!trip_requests_passenger_id_fkey (
          id,
          full_name,
          profile_image_url
        )
      `)
      .eq('is_active', true)

    // Filter by airports if provided
    if (departureAirport) {
      query = query.eq('departure_airport', departureAirport)
    }
    if (destinationAirport) {
      query = query.eq('destination_airport', destinationAirport)
    }

    // Filter by date
    if (searchByMonth && travelMonth) {
      // For month search, match requests that include this month
      query = query.or(`request_month.eq.${travelMonth},multiple_dates.cs.{${travelMonth}-01}`)
    } else if (!searchByMonth && travelDate) {
      // For specific date search
      query = query.or(`specific_date.eq.${travelDate},multiple_dates.cs.{${travelDate}}`)
    }

    // Only show future requests
    const today = new Date().toISOString().split('T')[0]
    query = query.or(`specific_date.gte.${today},expires_at.gte.${new Date().toISOString()}`)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  })
}

/**
 * Get ride requests for display in FindRide component
 */
export const getDisplayRideRequests = async (
  departureLocation?: string,
  destinationLocation?: string,
  travelDate?: string,
  travelMonth?: string,
  searchByMonth: boolean = false,
  excludeUserId?: string
): Promise<RideRequest[]> => {
  return retryWithBackoff(async () => {
    let query = supabase
      .from('ride_requests')
      .select(`
        *,
        user_profiles!ride_requests_passenger_id_fkey (
          id,
          full_name,
          profile_image_url
        )
      `)
      .eq('is_active', true)

    // Exclude specific user if provided
    if (excludeUserId) {
      query = query.neq('passenger_id', excludeUserId)
    }

    // Filter by location if provided (flexible matching)
    if (departureLocation) {
      query = query.or(`departure_location.ilike.%${departureLocation}%,departure_location.ilike.%${departureLocation.split(',')[0]}%`)
    }
    if (destinationLocation) {
      query = query.or(`destination_location.ilike.%${destinationLocation}%,destination_location.ilike.%${destinationLocation.split(',')[0]}%`)
    }

    // Filter by date
    if (searchByMonth && travelMonth) {
      query = query.or(`request_month.eq.${travelMonth},multiple_dates.cs.{${travelMonth}-01}`)
    } else if (!searchByMonth && travelDate) {
      query = query.or(`specific_date.eq.${travelDate},multiple_dates.cs.{${travelDate}}`)
    }

    // Only show future requests
    const today = new Date().toISOString().split('T')[0]
    query = query.or(`specific_date.gte.${today},expires_at.gte.${new Date().toISOString()}`)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  })
}

/**
 * Get trip requests for display in FindTrip component
 */
export const getDisplayTripRequests = async (
  departureAirport?: string,
  destinationAirport?: string,
  travelDate?: string,
  travelMonth?: string,
  searchByMonth: boolean = false,
  excludeUserId?: string
): Promise<TripRequest[]> => {
  return retryWithBackoff(async () => {
    let query = supabase
      .from('trip_requests')
      .select(`
        *,
        user_profiles!trip_requests_passenger_id_fkey (
          id,
          full_name,
          profile_image_url
        )
      `)
      .eq('is_active', true)

    // Exclude specific user if provided
    if (excludeUserId) {
      query = query.neq('passenger_id', excludeUserId)
    }

    // Filter by airports if provided
    if (departureAirport) {
      query = query.eq('departure_airport', departureAirport)
    }
    if (destinationAirport) {
      query = query.eq('destination_airport', destinationAirport)
    }

    // Filter by date
    if (searchByMonth && travelMonth) {
      query = query.or(`request_month.eq.${travelMonth},multiple_dates.cs.{${travelMonth}-01}`)
    } else if (!searchByMonth && travelDate) {
      query = query.or(`specific_date.eq.${travelDate},multiple_dates.cs.{${travelDate}}`)
    }

    // Only show future requests
    const today = new Date().toISOString().split('T')[0]
    query = query.or(`specific_date.gte.${today},expires_at.gte.${new Date().toISOString()}`)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  })
}

/**
 * Format request date display
 */
export const formatRequestDateDisplay = (request: RideRequest | TripRequest): string => {
  switch (request.request_type) {
    case 'specific_date':
      return request.specific_date ? formatDateSafe(request.specific_date) : 'Specific date'
    case 'multiple_dates':
      return request.multiple_dates && request.multiple_dates.length > 0
        ? `${request.multiple_dates.length} selected dates`
        : 'Multiple dates'
    case 'month':
      return request.request_month || 'Month'
    default:
      return 'Unknown'
  }
}

/**
 * Process notifications when a new ride is posted
 */
export const processNewRideNotifications = async (
  rideId: string
): Promise<{ success: boolean; notifiedUsers: number; error?: string }> => {
  return retryWithBackoff(async () => {
    // Find users who should be notified
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('find_ride_notification_recipients', { p_ride_id: rideId })

    if (recipientsError) {
      console.error('Error finding notification recipients:', recipientsError)
      return { success: true, notifiedUsers: 0 }
    }

    // Get ride details for notification
    const { data: ride, error: rideError } = await supabase
      .from('car_rides')
      .select(`
        *,
        user_profiles!car_rides_user_id_fkey (
          full_name
        )
      `)
      .eq('id', rideId)
      .single()

    if (rideError || !ride) {
      throw new Error('Ride not found')
    }

    let notifiedUsers = 0
    const driverName = ride.user_profiles?.full_name || 'Driver'

    // Send notifications
    for (const recipient of recipients || []) {
      try {
        await sendNewRideNotification(recipient.user_id, ride, driverName)
        notifiedUsers++
      } catch (error) {
        console.error('Error sending notification to user:', recipient.user_id, error)
      }
    }

    return { success: true, notifiedUsers }
  })
}

/**
 * Process notifications when a new trip is posted
 */
export const processNewTripNotifications = async (
  tripId: string
): Promise<{ success: boolean; notifiedUsers: number; error?: string }> => {
  return retryWithBackoff(async () => {
    // Find users who should be notified
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('find_trip_notification_recipients', { p_trip_id: tripId })

    if (recipientsError) {
      console.error('Error finding notification recipients:', recipientsError)
      return { success: true, notifiedUsers: 0 }
    }

    // Get trip details for notification
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        user_profiles!trips_user_id_fkey (
          full_name
        )
      `)
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      throw new Error('Trip not found')
    }

    let notifiedUsers = 0
    const travelerName = trip.user_profiles?.full_name || 'Traveler'

    // Send notifications
    for (const recipient of recipients || []) {
      try {
        await sendNewTripNotification(recipient.user_id, trip, travelerName)
        notifiedUsers++
      } catch (error) {
        console.error('Error sending notification to user:', recipient.user_id, error)
      }
    }

    return { success: true, notifiedUsers }
  })
}

/**
 * Send notification about new ride
 */
const sendNewRideNotification = async (
  userId: string,
  ride: any,
  driverName: string
): Promise<void> => {
  const message = `🎉 **New Ride Available!**

A driver has posted a ride matching your notification preferences!

🚗 **Driver:** ${driverName}
📍 **Route:** ${ride.from_location} → ${ride.to_location}
📅 **Date:** ${new Date(ride.departure_date_time).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}
⏰ **Time:** ${new Date(ride.departure_date_time).toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
})}
💰 **Price:** ${ride.currency || 'USD'} ${ride.price}${ride.negotiable ? ' (negotiable)' : ''}

💡 **Action:** Contact ${driverName} to request this ride!

📱 **Manage Notifications:** You can manage your notification preferences in Profile → Manage Alerts.`

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id: '00000000-0000-0000-0000-000000000000', // System user
      receiver_id: userId,
      message_content: message,
      message_type: 'system',
      is_read: false
    })

  if (error) {
    throw error
  }
}

/**
 * Send notification about new trip
 */
const sendNewTripNotification = async (
  userId: string,
  trip: any,
  travelerName: string
): Promise<void> => {
  const message = `🎉 **New Trip Available!**

A traveler has posted a trip matching your notification preferences!

✈️ **Traveler:** ${travelerName}
📍 **Route:** ${trip.leaving_airport} → ${trip.destination_airport}
📅 **Date:** ${new Date(trip.travel_date).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}
${trip.departure_time ? `⏰ **Departure:** ${trip.departure_time}${trip.departure_timezone ? ` (${trip.departure_timezone})` : ''}` : ''}
${trip.price ? `💰 **Service Fee:** ${trip.currency || 'USD'} ${trip.price}${trip.negotiable ? ' (negotiable)' : ''}` : '💰 **Free assistance**'}

💡 **Action:** Contact ${travelerName} to request assistance on this trip!

📱 **Manage Notifications:** You can manage your notification preferences in Profile → Manage Alerts.`

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id: '00000000-0000-0000-0000-000000000000', // System user
      receiver_id: userId,
      message_content: message,
      message_type: 'system',
      is_read: false
    })

  if (error) {
    throw error
  }
}