import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'
import { TripRequest, TripNotification } from '../types'

/**
 * Create a new trip request
 */
export const createTripRequest = async (
  requestData: Omit<TripRequest, 'id' | 'created_at' | 'updated_at' | 'user_profiles'>
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
      .from('trip_requests')
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
 * Create a trip notification preference
 */
export const createTripNotification = async (
  notificationData: Omit<TripNotification, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; notificationId?: string; error?: string }> => {
  return retryWithBackoff(async () => {
    console.log('createTripNotification called with data:', notificationData)
    
    // Validate required fields
    if (!notificationData.user_id || !notificationData.departure_airport || !notificationData.destination_airport) {
      throw new Error('Missing required notification data')
    }

    // Validate date type specific fields
    if (notificationData.date_type === 'specific_date' && !notificationData.specific_date) {
      throw new Error('Specific date is required when date_type is specific_date')
    }

    if (notificationData.date_type === 'multiple_dates' && (!notificationData.multiple_dates || notificationData.multiple_dates.length === 0)) {
      throw new Error('Multiple dates are required when date_type is multiple_dates')
    }

    if (notificationData.date_type === 'month' && !notificationData.notification_month) {
      throw new Error('Notification month is required when date_type is month')
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
      .from('trip_notifications')
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
 * Get user's active trip requests
 */
export const getUserTripRequests = async (userId: string): Promise<TripRequest[]> => {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('trip_requests')
      .select(`
        *,
        user_profiles!trip_requests_passenger_id_fkey (
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
 * Get user's active trip notifications
 */
export const getUserTripNotifications = async (userId: string): Promise<TripNotification[]> => {
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('trip_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return data || []
  })
}

/**
 * Delete a trip request
 */
export const deleteTripRequest = async (
  requestId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('trip_requests')
      .delete()
      .eq('id', requestId)
      .eq('passenger_id', userId)

    if (error) throw error

    return { success: true }
  })
}

/**
 * Delete a trip notification
 */
export const deleteTripNotification = async (
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    const { error } = await supabase
      .from('trip_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) throw error

    return { success: true }
  })
}

/**
 * Get trip request statistics for a user
 */
export const getTripRequestStats = async (userId: string): Promise<{
  activeRequests: number
  totalRequests: number
  matchesReceived: number
}> => {
  return retryWithBackoff(async () => {
    // Count active requests
    const { count: activeRequests } = await supabase
      .from('trip_requests')
      .select('*', { count: 'exact', head: true })
      .eq('passenger_id', userId)
      .eq('is_active', true)

    // Count total requests
    const { count: totalRequests } = await supabase
      .from('trip_requests')
      .select('*', { count: 'exact', head: true })
      .eq('passenger_id', userId)

    // Count notification matches (trips found for user's requests)
    const { count: matchesReceived } = await supabase
      .from('trip_notification_matches')
      .select('*', { count: 'exact', head: true })
      .eq('notified_user_id', userId)
      .eq('matched_item_type', 'trip_post')

    return {
      activeRequests: activeRequests || 0,
      totalRequests: totalRequests || 0,
      matchesReceived: matchesReceived || 0
    }
  })
}