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
  const dateInfo = request.request_type === 'specific_date' 
    ? `on ${new Date(request.specific_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`
    : request.request_type === 'month'
      ? `in ${request.request_month}`
      : 'on multiple dates'

  const message = `🔔 **Ride Request Alert!**

You have notifications enabled for this route and someone is looking for a ride!

👤 **Passenger:** ${passengerName}
📍 **Route:** ${request.departure_location} → ${request.destination_location}
📅 **When:** ${dateInfo}
🔍 **Search Radius:** ${request.search_radius_miles} miles

${request.additional_notes ? `📝 **Notes:** ${request.additional_notes}\n\n` : ''}💡 **Action:** If you can provide this ride, contact ${passengerName} or post a matching ride!

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
 * Send notification message for trip request
 */
const sendTripRequestNotificationMessage = async (
  userId: string,
  request: any,
  passengerName: string
): Promise<void> => {
  const dateInfo = request.request_type === 'specific_date' 
    ? `on ${new Date(request.specific_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`
    : request.request_type === 'month'
      ? `in ${request.request_month}`
      : 'on multiple dates'

  const message = `🔔 **Trip Request Alert!**

You have notifications enabled for this route and someone needs assistance!

👤 **Passenger:** ${passengerName}
📍 **Route:** ${request.departure_airport} → ${request.destination_airport}
📅 **When:** ${dateInfo}

${request.additional_notes ? `📝 **Notes:** ${request.additional_notes}\n\n` : ''}💡 **Action:** If you can provide assistance, contact ${passengerName} or post a matching trip!

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