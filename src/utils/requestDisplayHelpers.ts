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
  departureDate?: string,
  departureMonth?: string,
  searchByMonth: boolean = false,
  excludeUserId?: string
): Promise<RideRequest[]> => {
  return retryWithBackoff(async () => {
    console.log('getDisplayRideRequests called with:', {
      departureLocation,
      destinationLocation,
      departureDate,
      departureMonth,
      searchByMonth,
      excludeUserId
    })
    
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

    // Filter by location if provided
    if (departureLocation) {
      // Use individual filters to avoid PostgREST parsing issues with commas
      // First try to match departure location
      const cleanLocation = departureLocation.split(',')[0].trim() // Use just the city name
      query = query.or(`departure_location.ilike.%${cleanLocation}%,destination_location.ilike.%${cleanLocation}%`)
     }
     if (destinationLocation) {
      // Use individual filters to avoid PostgREST parsing issues with commas
      // First try to match destination location
      const cleanLocation = destinationLocation.split(',')[0].trim() // Use just the city name
      query = query.or(`departure_location.ilike.%${cleanLocation}%,destination_location.ilike.%${cleanLocation}%`)
    }

    // Filter by date
    if (searchByMonth && departureMonth) {
      query = query.or(`request_month.eq.${departureMonth},specific_date.gte.${departureMonth}-01,specific_date.lt.${getNextMonth(departureMonth)}-01`)
    } else if (!searchByMonth && departureDate) {
      query = query.or(`specific_date.eq.${departureDate},request_month.eq.${departureDate.substring(0, 7)}`)
    }

    // Only show future requests (basic filter)
    const today = new Date().toISOString().split('T')[0]
    query = query.or(`specific_date.gte.${today},specific_date.is.null,expires_at.gte.${new Date().toISOString()}`)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('getDisplayRideRequests error:', error)
      throw error
    }

    console.log('getDisplayRideRequests result:', data?.length || 0, 'requests found')
    if (data && data.length > 0) {
      console.log('Sample ride request data:', data[0])
    }
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
    console.log('getDisplayTripRequests called with:', {
      departureAirport,
      destinationAirport,
      travelDate,
      travelMonth,
      searchByMonth,
      excludeUserId
    })
    
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
      query = query.or(`request_month.eq.${travelMonth},specific_date.gte.${travelMonth}-01,specific_date.lt.${getNextMonth(travelMonth)}-01`)
    } else if (!searchByMonth && travelDate) {
      query = query.or(`specific_date.eq.${travelDate},request_month.eq.${travelDate.substring(0, 7)}`)
    }

    // Only show future requests (basic filter)
    const today = new Date().toISOString().split('T')[0]
    query = query.or(`specific_date.gte.${today},specific_date.is.null,expires_at.gte.${new Date().toISOString()}`)

    // Remove the excludeUserId filter to show user's own requests
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('getDisplayTripRequests error:', error)
      throw error
    }

    console.log('getDisplayTripRequests result:', data?.length || 0, 'requests found')
    if (data && data.length > 0) {
      console.log('Sample trip request data:', data[0])
    }
    return data || []
  })
}

/**
 * Helper function to get next month string
 */
const getNextMonth = (monthString: string): string => {
  const [year, month] = monthString.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

/**
 * Format request date display
 */
export const formatRequestDateDisplay = (request: RideRequest | TripRequest): string => {
  switch (request.request_type) {
    case 'specific_date':
      return request.specific_date ? formatDateSafe(request.specific_date) : 'Flexible date'
    case 'multiple_dates':
      if (request.multiple_dates && request.multiple_dates.length > 0) {
        const validDates = request.multiple_dates.filter(d => d)
        if (validDates.length === 1) {
          return formatDateSafe(validDates[0])
        }
        return `${validDates.length} dates`
      }
      return 'Flexible dates'
    case 'month':
      if (request.request_month) {
        const date = new Date(request.request_month + '-01')
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
      return 'Flexible month'
    default:
      return 'Flexible timing'
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