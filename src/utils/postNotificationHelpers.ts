import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'
import { CarRide, Trip } from '../types'
import { getUserDisplayName } from './messageTemplates'

export interface PostNotificationData {
  dateType: 'specific_date' | 'multiple_dates' | 'month'
  specificDate?: string
  multipleDates?: string[]
  notificationMonth?: string
}

/**
 * Create notification preference when posting a ride
 */
export const createRidePostNotification = async (
  rideId: string,
  userId: string,
  notificationData: PostNotificationData
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    // Get ride details for notification creation
    const { data: ride, error: rideError } = await supabase
      .from('car_rides')
      .select('*')
      .eq('id', rideId)
      .single()

    if (rideError || !ride) {
      throw new Error('Ride not found')
    }

    // Calculate expiry date
    let expiresAt: string | null = null
    
    if (notificationData.dateType === 'specific_date' && notificationData.specificDate) {
      const expiry = new Date(notificationData.specificDate)
      expiry.setHours(23, 59, 59, 999)
      expiresAt = expiry.toISOString()
    } else if (notificationData.dateType === 'multiple_dates' && notificationData.multipleDates) {
      const latestDate = notificationData.multipleDates.sort().pop()
      if (latestDate) {
        const expiry = new Date(latestDate)
        expiry.setHours(23, 59, 59, 999)
        expiresAt = expiry.toISOString()
      }
    } else if (notificationData.dateType === 'month' && notificationData.notificationMonth) {
      const [year, month] = notificationData.notificationMonth.split('-')
      const expiry = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
      expiresAt = expiry.toISOString()
    }

    // Create notification preference
    const { error } = await supabase
      .from('ride_notifications')
      .insert({
        user_id: userId,
        notification_type: 'driver_post',
        departure_location: ride.from_location,
        departure_latitude: ride.from_latitude,
        departure_longitude: ride.from_longitude,
        destination_location: ride.to_location,
        destination_latitude: ride.to_latitude,
        destination_longitude: ride.to_longitude,
        search_radius_miles: 25, // Default radius
        date_type: notificationData.dateType,
        specific_date: notificationData.specificDate || null,
        multiple_dates: notificationData.multipleDates || null,
        notification_month: notificationData.notificationMonth || null,
        is_active: true,
        expires_at: expiresAt
      })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true }
  })
}

/**
 * Create notification preference when posting a trip
 */
export const createTripPostNotification = async (
  tripId: string,
  userId: string,
  notificationData: PostNotificationData
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    // Get trip details for notification creation
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      throw new Error('Trip not found')
    }

    // Calculate expiry date
    let expiresAt: string | null = null
    
    if (notificationData.dateType === 'specific_date' && notificationData.specificDate) {
      const expiry = new Date(notificationData.specificDate)
      expiry.setHours(23, 59, 59, 999)
      expiresAt = expiry.toISOString()
    } else if (notificationData.dateType === 'multiple_dates' && notificationData.multipleDates) {
      const latestDate = notificationData.multipleDates.sort().pop()
      if (latestDate) {
        const expiry = new Date(latestDate)
        expiry.setHours(23, 59, 59, 999)
        expiresAt = expiry.toISOString()
      }
    } else if (notificationData.dateType === 'month' && notificationData.notificationMonth) {
      const [year, month] = notificationData.notificationMonth.split('-')
      const expiry = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
      expiresAt = expiry.toISOString()
    }

    // Create notification preference
    const { error } = await supabase
      .from('trip_notifications')
      .insert({
        user_id: userId,
        notification_type: 'traveler_post',
        departure_airport: trip.leaving_airport,
        destination_airport: trip.destination_airport,
        date_type: notificationData.dateType,
        specific_date: notificationData.specificDate || null,
        multiple_dates: notificationData.multipleDates || null,
        notification_month: notificationData.notificationMonth || null,
        is_active: true,
        expires_at: expiresAt
      })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true }
  })
}

/**
 * Process notifications for new ride requests
 */
export const processRideRequestNotifications = async (
  requestId: string
): Promise<{ success: boolean; notifiedUsers: number; error?: string }> => {
  return retryWithBackoff(async () => {
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

    // Find matching ride notifications
    const { data: matchingNotifications, error: notificationsError } = await supabase
      .rpc('find_ride_notification_recipients', { p_ride_id: requestId })

    if (notificationsError) {
      console.error('Error finding notification recipients:', notificationsError)
      return { success: true, notifiedUsers: 0 }
    }

    let notifiedUsers = 0
    const passengerName = request.user_profiles?.full_name || await getUserDisplayName(request.passenger_id)

    // Send notifications to matching users
    for (const notification of matchingNotifications || []) {
      try {
        await sendRideRequestNotificationMessage(
          notification.user_id,
          request,
          passengerName
        )
        notifiedUsers++
      } catch (error) {
        console.error('Error sending notification to user:', notification.user_id, error)
      }
    }

    return { success: true, notifiedUsers }
  })
}

/**
 * Process notifications for new trip requests
 */
export const processTripRequestNotifications = async (
  requestId: string
): Promise<{ success: boolean; notifiedUsers: number; error?: string }> => {
  return retryWithBackoff(async () => {
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

    // Find matching trip notifications
    const { data: matchingNotifications, error: notificationsError } = await supabase
      .rpc('find_trip_notification_recipients', { p_trip_id: requestId })

    if (notificationsError) {
      console.error('Error finding notification recipients:', notificationsError)
      return { success: true, notifiedUsers: 0 }
    }

    let notifiedUsers = 0
    const passengerName = request.user_profiles?.full_name || await getUserDisplayName(request.passenger_id)

    // Send notifications to matching users
    for (const notification of matchingNotifications || []) {
      try {
        await sendTripRequestNotificationMessage(
          notification.user_id,
          request,
          passengerName
        )
        notifiedUsers++
      } catch (error) {
        console.error('Error sending notification to user:', notification.user_id, error)
      }
    }

    return { success: true, notifiedUsers }
  })
}

/**
 * Send notification message for ride request
 */
const sendRideRequestNotificationMessage = async (
  userId: string,
  request: any,
  passengerName: string
): Promise<void> => {
  let dateInfo = 'on multiple dates'
  if (request.request_type === 'specific_date' && request.specific_date) {
    const [year, month, day] = request.specific_date.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    dateInfo = `on ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
  } else if (request.request_type === 'month') {
    dateInfo = `in ${request.request_month}`
  }

  const title = '🔔 Ride Request Alert!'
  const message = `${passengerName} is looking for a ride: ${request.departure_location} → ${request.destination_location} ${dateInfo}. ${request.additional_notes ? `Notes: ${request.additional_notes}` : ''}`

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

  if (error) {
    throw error
  }
}

/**
 * Send notification message for trip request
 */
const sendTripRequestNotificationMessage = async (
  userId: string,
  request: any,
  passengerName: string
): Promise<void> => {
  let dateInfo = 'on multiple dates'
  if (request.request_type === 'specific_date' && request.specific_date) {
    const [year, month, day] = request.specific_date.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    dateInfo = `on ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
  } else if (request.request_type === 'month') {
    dateInfo = `in ${request.request_month}`
  }

  const title = '🔔 Trip Request Alert!'
  const message = `${passengerName} is looking for assistance: ${request.departure_airport} → ${request.destination_airport} ${dateInfo}. ${request.additional_notes ? `Notes: ${request.additional_notes}` : ''}`

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

  if (error) {
    throw error
  }
}