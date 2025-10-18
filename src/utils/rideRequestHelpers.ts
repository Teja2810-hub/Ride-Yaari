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

    return { success: true, requestId: data.id }
  })
}

/**
 * Create a ride notification preference
 */
export const createRideNotification = async (
  notificationData: Omit<RideNotification, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; notificationId?: string; error?: string }> => {
  return retryWithBackoff(async () => {
    console.log('createRideNotification called with data:', notificationData)

    // Validate required fields
    if (!notificationData.user_id || !notificationData.departure_location || !notificationData.destination_location) {
      const errorMsg = 'Missing required notification data: ' + JSON.stringify({
        user_id: !!notificationData.user_id,
        departure_location: !!notificationData.departure_location,
        destination_location: !!notificationData.destination_location
      })
      console.error(errorMsg)
      throw new Error(errorMsg)
    }

    // Validate date type specific fields
    if (notificationData.date_type === 'specific_date' && !notificationData.specific_date) {
      const errorMsg = 'Specific date is required when date_type is specific_date'
      console.error(errorMsg, notificationData)
      throw new Error(errorMsg)
    }

    if (notificationData.date_type === 'multiple_dates' && (!notificationData.multiple_dates || notificationData.multiple_dates.length === 0)) {
      const errorMsg = 'Multiple dates are required when date_type is multiple_dates'
      console.error(errorMsg, notificationData)
      throw new Error(errorMsg)
    }

    if (notificationData.date_type === 'month' && !notificationData.notification_month) {
      const errorMsg = 'Notification month is required when date_type is month'
      console.error(errorMsg, notificationData)
      throw new Error(errorMsg)
    }

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

    console.log('Calculated expiry date:', expiresAt)
    
    const insertData = {
      ...notificationData,
      expires_at: expiresAt
    }
    
    console.log('Inserting notification data:', insertData)
    
    const { data, error } = await supabase
      .from('ride_notifications')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database error creating notification:', error)
      throw new Error(`Failed to create notification: ${error.message}`)
    }
    
    console.log('Notification created successfully:', data)

    return { success: true, notificationId: data.id }
  })
}

/**
 * Get user's active ride requests
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