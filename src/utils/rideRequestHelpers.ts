import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'
import { RideRequest, RideNotification, NotificationMatch } from '../types'
import { haversineDistance } from './distance'

/**
 * Create a new ride request
 */
export const createRideRequest = async (
  requestData: Omit<RideRequest, 'id' | 'created_at' | 'updated_at' | 'user_profiles'>
): Promise<{ success: boolean; requestId?: string; error?: string }> => {
  return retryWithBackoff(async () => {
    // Calculate expiry date based on request type
    let expiresAt: string | null = null
    
    if (requestData.request_type === 'specific_date' && requestData.specific_date) {
      // Expire at end of the specific date
      const expiry = new Date(requestData.specific_date)
      expiry.setHours(23, 59, 59, 999)
      expiresAt = expiry.toISOString()
    } else if (requestData.request_type === 'multiple_dates' && requestData.multiple_dates) {
      // Expire after the latest date
      const latestDate = requestData.multiple_dates.sort().pop()
      if (latestDate) {
        const expiry = new Date(latestDate)
        expiry.setHours(23, 59, 59, 999)
        expiresAt = expiry.toISOString()
      }
    } else if (requestData.request_type === 'month' && requestData.request_month) {
      // Expire at end of the month
      const [year, month] = requestData.request_month.split('-')
      const expiry = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
      expiresAt = expiry.toISOString()
    }

    const { data, error } = await supabase
      .from('ride_requests')
      .insert({
        ...requestData,
        expires_at: expiresAt
      })
      .select()
      .single()

    if (error) throw error

    // Find and notify matching drivers
    await notifyMatchingDrivers(data.id)

    return { success: true, requestId: data.id }
  })
}

/**
 * Find drivers who match a ride request and send notifications
 */
export const notifyMatchingDrivers = async (requestId: string): Promise<void> => {
  return retryWithBackoff(async () => {
    // Get the ride request details
    const { data: request, error: requestError } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      throw new Error('Ride request not found')
    }

    // Find matching drivers using the database function
    const { data: matches, error: matchError } = await supabase
      .rpc('find_matching_drivers', {
        p_departure_lat: request.departure_latitude,
        p_departure_lon: request.departure_longitude,
        p_destination_lat: request.destination_latitude,
        p_destination_lon: request.destination_longitude,
        p_search_radius: request.search_radius_miles,
        p_request_date: request.specific_date,
        p_request_month: request.request_month
      })

    if (matchError) {
      console.error('Error finding matching drivers:', matchError)
      return
    }

    // Send notifications to matching drivers
    for (const match of matches || []) {
      await sendRideRequestNotification(
        match.driver_id,
        requestId,
        request.passenger_id,
        match.departure_distance,
        match.destination_distance
      )
    }
  })
}

/**
 * Send notification to a driver about a ride request
 */
export const sendRideRequestNotification = async (
  driverId: string,
  requestId: string,
  passengerId: string,
  departureDistance: number,
  destinationDistance: number
): Promise<void> => {
  try {
    // Get passenger and request details
    const { data: request } = await supabase
      .from('ride_requests')
      .select(`
        *,
        user_profiles!ride_requests_passenger_id_fkey (
          full_name
        )
      `)
      .eq('id', requestId)
      .single()

    if (!request) return

    const passengerName = request.user_profiles?.full_name || 'A passenger'
    const dateInfo = request.request_type === 'specific_date' 
      ? `on ${new Date(request.specific_date!).toLocaleDateString()}`
      : request.request_type === 'month'
        ? `in ${request.request_month}`
        : 'on multiple dates'

    // Send system message to driver
    await supabase
      .from('chat_messages')
      .insert({
        sender_id: '00000000-0000-0000-0000-000000000000', // System user
        receiver_id: driverId,
        message_content: `🚗 **Ride Request Nearby!**

👤 **Passenger:** ${passengerName}
📍 **Route:** ${request.departure_location} → ${request.destination_location}
📅 **When:** ${dateInfo}
📏 **Distance:** ~${Math.round(departureDistance)}mi from departure, ~${Math.round(destinationDistance)}mi from destination
💰 **Max Price:** ${request.max_price ? `${request.currency} ${request.max_price}` : 'Negotiable'}
🔍 **Search Radius:** ${request.search_radius_miles} miles

${request.additional_notes ? `📝 **Notes:** ${request.additional_notes}` : ''}

💡 **Action:** Contact ${passengerName} if you can provide this ride!`,
        message_type: 'system',
        is_read: false
      })

    console.log(`Ride request notification sent to driver ${driverId}`)
  } catch (error) {
    console.error('Error sending ride request notification:', error)
  }
}

/**
 * Get active ride requests for a user
 */
export const getUserRideRequests = async (userId: string): Promise<RideRequest[]> => {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('ride_requests')
      .select(`
        *,
        user_profiles!ride_requests_passenger_id_fkey (
          id,
          full_name,
          profile_image_url
        )
      `)
      .eq('passenger_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  })
}

/**
 * Delete a ride request
 */
export const deleteRideRequest = async (
  requestId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('ride_requests')
      .delete()
      .eq('id', requestId)
      .eq('passenger_id', userId)

    if (error) throw error

    return { success: true }
  })
}

/**
 * Create a ride notification preference
 */
export const createRideNotification = async (
  notificationData: Omit<RideNotification, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; notificationId?: string; error?: string }> => {
  return retryWithBackoff(async () => {
    // Calculate expiry date based on notification type
    let expiresAt: string | null = null
    
    if (notificationData.date_type === 'specific_date' && notificationData.specific_date) {
      // Expire at end of the specific date
      const expiry = new Date(notificationData.specific_date)
      expiry.setHours(23, 59, 59, 999)
      expiresAt = expiry.toISOString()
    } else if (notificationData.date_type === 'multiple_dates' && notificationData.multiple_dates) {
      // Expire after the latest date
      const latestDate = notificationData.multiple_dates.sort().pop()
      if (latestDate) {
        const expiry = new Date(latestDate)
        expiry.setHours(23, 59, 59, 999)
        expiresAt = expiry.toISOString()
      }
    } else if (notificationData.date_type === 'month' && notificationData.notification_month) {
      // Expire at end of the month
      const [year, month] = notificationData.notification_month.split('-')
      const expiry = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
      expiresAt = expiry.toISOString()
    }

    const { data, error } = await supabase
      .from('ride_notifications')
      .insert({
        ...notificationData,
        expires_at: expiresAt
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, notificationId: data.id }
  })
}

/**
 * Get user's active ride notifications
 */
export const getUserRideNotifications = async (userId: string): Promise<RideNotification[]> => {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('ride_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  })
}

/**
 * Delete a ride notification
 */
export const deleteRideNotification = async (
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('ride_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) throw error

    return { success: true }
  })
}

/**
 * Check for matching ride requests when a new ride is posted
 */
export const checkMatchingRideRequests = async (
  rideId: string,
  driverId: string
): Promise<void> => {
  try {
    // Get the ride details
    const { data: ride, error: rideError } = await supabase
      .from('car_rides')
      .select('*')
      .eq('id', rideId)
      .single()

    if (rideError || !ride) return

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

    if (requestsError || !requests) return

    // Check each request for proximity match
    for (const request of requests) {
      if (!request.departure_latitude || !request.departure_longitude || 
          !request.destination_latitude || !request.destination_longitude ||
          !ride.from_latitude || !ride.from_longitude ||
          !ride.to_latitude || !ride.to_longitude) {
        continue
      }

      const departureDistance = haversineDistance(
        request.departure_latitude,
        request.departure_longitude,
        ride.from_latitude,
        ride.from_longitude
      )

      const destinationDistance = haversineDistance(
        request.destination_latitude,
        request.destination_longitude,
        ride.to_latitude,
        ride.to_longitude
      )

      // Check if within search radius
      if (departureDistance <= request.search_radius_miles && 
          destinationDistance <= request.search_radius_miles) {
        
        // Check date matching
        const rideDate = new Date(ride.departure_date_time)
        let dateMatches = false

        if (request.request_type === 'specific_date' && request.specific_date) {
          dateMatches = rideDate.toDateString() === new Date(request.specific_date).toDateString()
        } else if (request.request_type === 'multiple_dates' && request.multiple_dates) {
          dateMatches = request.multiple_dates.some(date => 
            rideDate.toDateString() === new Date(date).toDateString()
          )
        } else if (request.request_type === 'month' && request.request_month) {
          const rideMonth = `${rideDate.getFullYear()}-${String(rideDate.getMonth() + 1).padStart(2, '0')}`
          dateMatches = rideMonth === request.request_month
        }

        if (dateMatches) {
          // Send notification to passenger about matching ride
          await sendMatchingRideNotification(
            request.passenger_id,
            rideId,
            driverId,
            departureDistance,
            destinationDistance
          )
        }
      }
    }
  } catch (error) {
    console.error('Error checking matching ride requests:', error)
  }
}

/**
 * Send notification to passenger about a matching ride
 */
export const sendMatchingRideNotification = async (
  passengerId: string,
  rideId: string,
  driverId: string,
  departureDistance: number,
  destinationDistance: number
): Promise<void> => {
  try {
    // Get ride and driver details
    const { data: ride } = await supabase
      .from('car_rides')
      .select(`
        *,
        user_profiles!car_rides_user_id_fkey (
          full_name
        )
      `)
      .eq('id', rideId)
      .single()

    if (!ride) return

    const driverName = ride.user_profiles?.full_name || 'A driver'
    const rideDate = new Date(ride.departure_date_time)

    // Send system message to passenger
    await supabase
      .from('chat_messages')
      .insert({
        sender_id: '00000000-0000-0000-0000-000000000000', // System user
        receiver_id: passengerId,
        message_content: `🎉 **Matching Ride Found!**

🚗 **Driver:** ${driverName}
📍 **Route:** ${ride.from_location} → ${ride.to_location}
📅 **Date:** ${rideDate.toLocaleDateString()}
⏰ **Time:** ${rideDate.toLocaleTimeString()}
💰 **Price:** ${ride.currency} ${ride.price}${ride.negotiable ? ' (negotiable)' : ''}
📏 **Distance:** ~${Math.round(departureDistance)}mi from your departure, ~${Math.round(destinationDistance)}mi from your destination

💡 **Action:** Contact ${driverName} to request this ride!`,
        message_type: 'system',
        is_read: false
      })

    console.log(`Matching ride notification sent to passenger ${passengerId}`)
  } catch (error) {
    console.error('Error sending matching ride notification:', error)
  }
}

/**
 * Clean up expired ride requests and notifications
 */
export const cleanupExpiredRequests = async (): Promise<{
  expiredRequests: number
  expiredNotifications: number
}> => {
  return retryWithBackoff(async () => {
    // Clean up expired ride requests
    const { data: expiredRequests, error: requestsError } = await supabase
      .from('ride_requests')
      .update({ is_active: false })
      .eq('is_active', true)
      .lte('expires_at', new Date().toISOString())
      .select()

    if (requestsError) {
      console.error('Error cleaning up expired requests:', requestsError)
    }

    // Clean up expired notifications
    const { data: expiredNotifications, error: notificationsError } = await supabase
      .from('ride_notifications')
      .update({ is_active: false })
      .eq('is_active', true)
      .lte('expires_at', new Date().toISOString())
      .select()

    if (notificationsError) {
      console.error('Error cleaning up expired notifications:', notificationsError)
    }

    return {
      expiredRequests: expiredRequests?.length || 0,
      expiredNotifications: expiredNotifications?.length || 0
    }
  })
}

/**
 * Get ride request statistics for a user
 */
export const getRideRequestStats = async (userId: string): Promise<{
  activeRequests: number
  totalRequests: number
  matchesReceived: number
}> => {
  return retryWithBackoff(async () => {
    // Count active requests
    const { count: activeRequests } = await supabase
      .from('ride_requests')
      .select('*', { count: 'exact', head: true })
      .eq('passenger_id', userId)
      .eq('is_active', true)

    // Count total requests
    const { count: totalRequests } = await supabase
      .from('ride_requests')
      .select('*', { count: 'exact', head: true })
      .eq('passenger_id', userId)

    // Count notification matches (rides found for user's requests)
    const { count: matchesReceived } = await supabase
      .from('notification_matches')
      .select('*', { count: 'exact', head: true })
      .eq('notified_user_id', userId)
      .eq('matched_item_type', 'ride_post')

    return {
      activeRequests: activeRequests || 0,
      totalRequests: totalRequests || 0,
      matchesReceived: matchesReceived || 0
    }
  })
}