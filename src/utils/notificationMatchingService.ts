import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'
import { CarRide, Trip, RideRequest, TripRequest } from '../types'
import { haversineDistance } from './distance'
import { getUserDisplayName } from './messageTemplates'

/**
 * Find and notify users when new rides match their requests
 */
export const processNewRideNotifications = async (rideId: string): Promise<{
  success: boolean
  notifiedUsers: number
  error?: string
}> => {
  return retryWithBackoff(async () => {
    // Get ride details
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

    // Find matching ride requests
    const { data: requests, error: requestsError } = await supabase
      .from('ride_requests')
      .select(`
        *,
        user_profiles!ride_requests_passenger_id_fkey (
          full_name
        )
      `)
      .eq('is_active', true)
      .neq('passenger_id', ride.user_id) // Don't notify ride owner

    if (requestsError) {
      throw new Error(requestsError.message)
    }

    let notifiedUsers = 0
    const driverName = ride.user_profiles?.full_name || 'Driver'

    for (const request of requests || []) {
      try {
        // Check location and date matching
        if (await isRideMatchingRequest(ride, request)) {
          await sendRideMatchNotification(request.passenger_id, ride, driverName)
          notifiedUsers++
        }
      } catch (error) {
        console.error('Error notifying user:', request.passenger_id, error)
      }
    }

    return { success: true, notifiedUsers }
  })
}

/**
 * Find and notify users when new trips match their requests
 */
export const processNewTripNotifications = async (tripId: string): Promise<{
  success: boolean
  notifiedUsers: number
  error?: string
}> => {
  return retryWithBackoff(async () => {
    // Get trip details
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

    // Find matching trip requests
    const { data: requests, error: requestsError } = await supabase
      .from('trip_requests')
      .select(`
        *,
        user_profiles!trip_requests_passenger_id_fkey (
          full_name
        )
      `)
      .eq('is_active', true)
      .eq('departure_airport', trip.leaving_airport)
      .eq('destination_airport', trip.destination_airport)
      .neq('passenger_id', trip.user_id) // Don't notify trip owner

    if (requestsError) {
      throw new Error(requestsError.message)
    }

    let notifiedUsers = 0
    const travelerName = trip.user_profiles?.full_name || 'Traveler'

    for (const request of requests || []) {
      try {
        // Check date matching
        if (await isTripMatchingRequest(trip, request)) {
          await sendTripMatchNotification(request.passenger_id, trip, travelerName)
          notifiedUsers++
        }
      } catch (error) {
        console.error('Error notifying user:', request.passenger_id, error)
      }
    }

    return { success: true, notifiedUsers }
  })
}

/**
 * Process notification preferences when new requests are made
 */
export const processRequestNotifications = async (
  requestId: string,
  type: 'ride' | 'trip'
): Promise<{
  success: boolean
  notifiedUsers: number
  error?: string
}> => {
  return retryWithBackoff(async () => {
    if (type === 'ride') {
      return await processRideRequestNotifications(requestId)
    } else {
      return await processTripRequestNotifications(requestId)
    }
  })
}

/**
 * Process ride request notifications
 */
const processRideRequestNotifications = async (requestId: string): Promise<{
  success: boolean
  notifiedUsers: number
  error?: string
}> => {
  // Get request details
  const { data: request, error: requestError } = await supabase
    .from('ride_requests')
    .select(`
      *,
      user_profiles!ride_requests_passenger_id_fkey (
        full_name
      )
    `)
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    throw new Error('Ride request not found')
  }

  // Find matching notification preferences
  const { data: notifications, error: notificationsError } = await supabase
    .from('ride_notifications')
    .select(`
      *,
      user_profiles!ride_notifications_user_id_fkey (
        full_name
      )
    `)
    .eq('notification_type', 'driver_post')
    .eq('is_active', true)
    .neq('user_id', request.passenger_id) // Don't notify requester

  if (notificationsError) {
    throw new Error(notificationsError.message)
  }

  let notifiedUsers = 0
  const passengerName = request.user_profiles?.full_name || 'Passenger'

  for (const notification of notifications || []) {
    try {
      if (await isRequestMatchingNotification(request, notification)) {
        await sendRequestNotificationAlert(notification.user_id, request, passengerName)
        notifiedUsers++
      }
    } catch (error) {
      console.error('Error notifying user:', notification.user_id, error)
    }
  }

  return { success: true, notifiedUsers }
}

/**
 * Process trip request notifications
 */
const processTripRequestNotifications = async (requestId: string): Promise<{
  success: boolean
  notifiedUsers: number
  error?: string
}> => {
  // Get request details
  const { data: request, error: requestError } = await supabase
    .from('trip_requests')
    .select(`
      *,
      user_profiles!trip_requests_passenger_id_fkey (
        full_name
      )
    `)
    .eq('id', requestId)
    .single()

  if (requestError || !request) {
    throw new Error('Trip request not found')
  }

  // Find matching notification preferences
  const { data: notifications, error: notificationsError } = await supabase
    .from('trip_notifications')
    .select(`
      *,
      user_profiles!trip_notifications_user_id_fkey (
        full_name
      )
    `)
    .eq('notification_type', 'traveler_post')
    .eq('is_active', true)
    .eq('departure_airport', request.departure_airport)
    .eq('destination_airport', request.destination_airport)
    .neq('user_id', request.passenger_id) // Don't notify requester

  if (notificationsError) {
    throw new Error(notificationsError.message)
  }

  let notifiedUsers = 0
  const passengerName = request.user_profiles?.full_name || 'Passenger'

  for (const notification of notifications || []) {
    try {
      if (await isTripRequestMatchingNotification(request, notification)) {
        await sendTripRequestNotificationAlert(notification.user_id, request, passengerName)
        notifiedUsers++
      }
    } catch (error) {
      console.error('Error notifying user:', notification.user_id, error)
    }
  }

  return { success: true, notifiedUsers }
}

/**
 * Check if ride matches request criteria
 */
const isRideMatchingRequest = async (ride: CarRide, request: RideRequest): Promise<boolean> => {
  // Check location proximity if coordinates available
  if (ride.from_latitude && ride.from_longitude && 
      request.departure_latitude && request.departure_longitude) {
    const departureDistance = haversineDistance(
      ride.from_latitude,
      ride.from_longitude,
      request.departure_latitude,
      request.departure_longitude
    )
    
    const destinationDistance = haversineDistance(
      ride.to_latitude || 0,
      ride.to_longitude || 0,
      request.destination_latitude || 0,
      request.destination_longitude || 0
    )
    
    if (departureDistance > request.search_radius_miles || 
        destinationDistance > request.search_radius_miles) {
      return false
    }
  } else {
    // Fallback to text matching
    const fromMatch = ride.from_location.toLowerCase().includes(request.departure_location.toLowerCase()) ||
                     request.departure_location.toLowerCase().includes(ride.from_location.toLowerCase())
    const toMatch = ride.to_location.toLowerCase().includes(request.destination_location.toLowerCase()) ||
                   request.destination_location.toLowerCase().includes(ride.to_location.toLowerCase())
    
    if (!fromMatch || !toMatch) return false
  }

  // Check date matching
  const rideDate = new Date(ride.departure_date_time)
  
  if (request.request_type === 'specific_date' && request.specific_date) {
    return rideDate.toDateString() === new Date(request.specific_date).toDateString()
  } else if (request.request_type === 'multiple_dates' && request.multiple_dates) {
    return request.multiple_dates.some(date => 
      rideDate.toDateString() === new Date(date).toDateString()
    )
  } else if (request.request_type === 'month' && request.request_month) {
    const rideMonth = `${rideDate.getFullYear()}-${String(rideDate.getMonth() + 1).padStart(2, '0')}`
    return rideMonth === request.request_month
  }

  return false
}

/**
 * Check if trip matches request criteria
 */
const isTripMatchingRequest = async (trip: Trip, request: TripRequest): Promise<boolean> => {
  // Check airport matching
  if (trip.leaving_airport !== request.departure_airport || 
      trip.destination_airport !== request.destination_airport) {
    return false
  }

  // Check date matching
  const tripDate = new Date(trip.travel_date)
  
  if (request.request_type === 'specific_date' && request.specific_date) {
    return tripDate.toDateString() === new Date(request.specific_date).toDateString()
  } else if (request.request_type === 'multiple_dates' && request.multiple_dates) {
    return request.multiple_dates.some(date => 
      tripDate.toDateString() === new Date(date).toDateString()
    )
  } else if (request.request_type === 'month' && request.request_month) {
    const tripMonth = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`
    return tripMonth === request.request_month
  }

  return false
}

/**
 * Check if request matches notification criteria
 */
const isRequestMatchingNotification = async (request: RideRequest, notification: any): Promise<boolean> => {
  // Check location proximity
  if (notification.departure_latitude && notification.departure_longitude && 
      request.departure_latitude && request.departure_longitude) {
    const departureDistance = haversineDistance(
      notification.departure_latitude,
      notification.departure_longitude,
      request.departure_latitude,
      request.departure_longitude
    )
    
    const destinationDistance = haversineDistance(
      notification.destination_latitude || 0,
      notification.destination_longitude || 0,
      request.destination_latitude || 0,
      request.destination_longitude || 0
    )
    
    if (departureDistance > notification.search_radius_miles || 
        destinationDistance > notification.search_radius_miles) {
      return false
    }
  }

  // Check date matching
  if (notification.date_type === 'specific_date' && notification.specific_date) {
    if (request.request_type === 'specific_date' && request.specific_date) {
      return new Date(notification.specific_date).toDateString() === new Date(request.specific_date).toDateString()
    }
  } else if (notification.date_type === 'multiple_dates' && notification.multiple_dates) {
    if (request.request_type === 'specific_date' && request.specific_date) {
      return notification.multiple_dates.some(date => 
        new Date(date).toDateString() === new Date(request.specific_date!).toDateString()
      )
    }
  } else if (notification.date_type === 'month' && notification.notification_month) {
    if (request.request_type === 'month' && request.request_month) {
      return notification.notification_month === request.request_month
    }
  }

  return false
}

/**
 * Check if trip request matches notification criteria
 */
const isTripRequestMatchingNotification = async (request: TripRequest, notification: any): Promise<boolean> => {
  // Check airport matching
  if (notification.departure_airport !== request.departure_airport || 
      notification.destination_airport !== request.destination_airport) {
    return false
  }

  // Check date matching
  if (notification.date_type === 'specific_date' && notification.specific_date) {
    if (request.request_type === 'specific_date' && request.specific_date) {
      return new Date(notification.specific_date).toDateString() === new Date(request.specific_date).toDateString()
    }
  } else if (notification.date_type === 'multiple_dates' && notification.multiple_dates) {
    if (request.request_type === 'specific_date' && request.specific_date) {
      return notification.multiple_dates.some(date => 
        new Date(date).toDateString() === new Date(request.specific_date!).toDateString()
      )
    }
  } else if (notification.date_type === 'month' && notification.notification_month) {
    if (request.request_type === 'month' && request.request_month) {
      return notification.notification_month === request.request_month
    }
  }

  return false
}

/**
 * Send notification about matching ride
 */
const sendRideMatchNotification = async (
  userId: string,
  ride: CarRide,
  driverName: string
): Promise<void> => {
  const rideDate = new Date(ride.departure_date_time)
  const dateStr = rideDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
  const timeStr = rideDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' })

  const title = '🎉 Matching Ride Found!'
  const message = `${driverName} posted a ride matching your request: ${ride.from_location} → ${ride.to_location} on ${dateStr} at ${timeStr}. Price: ${ride.currency || 'USD'} ${ride.price}${ride.negotiable ? ' (negotiable)' : ''}.`

  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      notification_type: 'ride_match',
      title,
      message,
      priority: 'high',
      is_read: false,
      related_user_id: ride.user_id,
      related_user_name: driverName,
      action_data: {
        ride_id: ride.id,
        driver_id: ride.user_id
      }
    })

  if (error) throw error

  // Send a system chat message with embedded user ID
  const chatMessage = `🎉 Matching Ride Found! ${driverName} posted a ride: ${ride.from_location} → ${ride.to_location} on ${dateStr} at ${timeStr}. Price: ${ride.currency || 'USD'} ${ride.price}${ride.negotiable ? ' (negotiable)' : ''}. [user_id:${ride.user_id}][ride_id:${ride.id}]`

  await supabase
    .from('chat_messages')
    .insert({
      sender_id: 'SYSTEM_USER',
      receiver_id: userId,
      message_content: chatMessage,
      message_type: 'system',
      is_read: false
    })
}

/**
 * Send notification about matching trip
 */
const sendTripMatchNotification = async (
  userId: string,
  trip: Trip,
  travelerName: string
): Promise<void> => {
  const tripDate = new Date(trip.travel_date)
  const dateStr = tripDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

  const title = '🎉 Matching Trip Found!'
  const message = `${travelerName} posted a trip matching your request: ${trip.leaving_airport} → ${trip.destination_airport} on ${dateStr}${trip.departure_time ? ` at ${trip.departure_time}` : ''}. ${trip.price ? `Fee: ${trip.currency || 'USD'} ${trip.price}${trip.negotiable ? ' (negotiable)' : ''}` : 'Free assistance'}.`

  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      notification_type: 'trip_match',
      title,
      message,
      priority: 'high',
      is_read: false,
      related_user_id: trip.user_id,
      related_user_name: travelerName,
      action_data: {
        trip_id: trip.id,
        traveler_id: trip.user_id
      }
    })

  if (error) throw error

  // Send a system chat message with embedded user ID
  const chatMessage = `🎉 Matching Trip Found! ${travelerName} posted a trip: ${trip.leaving_airport} → ${trip.destination_airport} on ${dateStr}${trip.departure_time ? ` at ${trip.departure_time}` : ''}. ${trip.price ? `Fee: ${trip.currency || 'USD'} ${trip.price}${trip.negotiable ? ' (negotiable)' : ''}` : 'Free assistance'}. [user_id:${trip.user_id}][trip_id:${trip.id}]`

  await supabase
    .from('chat_messages')
    .insert({
      sender_id: 'SYSTEM_USER',
      receiver_id: userId,
      message_content: chatMessage,
      message_type: 'system',
      is_read: false
    })
}

/**
 * Send notification alert for ride request
 */
const sendRequestNotificationAlert = async (
  userId: string,
  request: RideRequest,
  passengerName: string
): Promise<void> => {
  const dateInfo = request.request_type === 'specific_date'
    ? `on ${new Date(request.specific_date!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
    : request.request_type === 'month'
      ? `in ${request.request_month}`
      : 'on multiple dates'

  const title = '🔔 Ride Request Alert!'
  const message = `${passengerName} is looking for a ride: ${request.departure_location} → ${request.destination_location} ${dateInfo}${request.departure_time_preference ? ` at ${request.departure_time_preference}` : ''}. ${request.additional_notes ? `Notes: ${request.additional_notes}` : ''}`

  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      notification_type: 'ride_request_alert',
      title,
      message,
      priority: 'medium',
      is_read: false,
      related_user_id: request.passenger_id,
      related_user_name: passengerName,
      action_data: {
        request_id: request.id,
        passenger_id: request.passenger_id
      }
    })

  if (error) throw error
}

/**
 * Send notification alert for trip request
 */
const sendTripRequestNotificationAlert = async (
  userId: string,
  request: TripRequest,
  passengerName: string
): Promise<void> => {
  const dateInfo = request.request_type === 'specific_date'
    ? `on ${new Date(request.specific_date!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
    : request.request_type === 'month'
      ? `in ${request.request_month}`
      : 'on multiple dates'

  const title = '🔔 Trip Request Alert!'
  const message = `${passengerName} is looking for assistance: ${request.departure_airport} → ${request.destination_airport} ${dateInfo}${request.departure_time_preference ? ` at ${request.departure_time_preference}` : ''}. ${request.additional_notes ? `Notes: ${request.additional_notes}` : ''}`

  const { error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      notification_type: 'trip_request_alert',
      title,
      message,
      priority: 'medium',
      is_read: false,
      related_user_id: request.passenger_id,
      related_user_name: passengerName,
      action_data: {
        request_id: request.id,
        passenger_id: request.passenger_id
      }
    })

  if (error) throw error
}