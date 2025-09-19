import { supabase } from './supabase'
import { RideConfirmation, CarRide, Trip } from '../types'
import { notificationService } from './notificationService'

export interface ConfirmationAction {
  type: 'request_again' | 'reverse_cancellation' | 'expire_confirmation'
  confirmationId: string
  userId: string
  reason?: string
}

export interface ExpirySettings {
  pendingExpiryHours: number
  acceptedExpiryDays: number
  enableAutoExpiry: boolean
}

/**
 * Handle "Request Again" functionality for rejected confirmations
 */
export const requestAgain = async (
  confirmationId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get the existing confirmation
    const { data: confirmation, error: fetchError } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        car_rides!ride_confirmations_ride_id_fkey (
          id,
          from_location,
          to_location,
          departure_date_time,
          user_id
        ),
        trips!ride_confirmations_trip_id_fkey (
          id,
          leaving_airport,
          destination_airport,
          travel_date,
          user_id
        )
      `)
      .eq('id', confirmationId)
      .eq('passenger_id', userId)
      .single()

    if (fetchError || !confirmation) {
      return { success: false, error: 'Confirmation not found or access denied' }
    }

    if (confirmation.status !== 'rejected') {
      return { success: false, error: 'Can only request again for rejected confirmations' }
    }

    // Check if the ride/trip is still in the future
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    const departureTime = ride ? ride.departure_date_time : trip?.travel_date

    if (departureTime && new Date(departureTime) <= new Date()) {
      return { success: false, error: 'Cannot request again for past rides/trips' }
    }

    // Update the confirmation status back to pending
    const { error: updateError } = await supabase
      .from('ride_confirmations')
      .update({
        status: 'pending',
        confirmed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', confirmationId)

    if (updateError) {
      return { success: false, error: 'Failed to update confirmation status' }
    }

    // Send enhanced system message to the ride owner
    const ownerId = confirmation.ride_owner_id
    let enhancedMessage = `🔄 **Request Again Notification**\n\nA passenger has requested to join your ${ride ? 'car ride' : 'airport trip'} again after it was previously declined.`
    
    if (reason) {
      enhancedMessage += `\n\n💬 **Passenger's Message:** "${reason}"`
    }
    
    enhancedMessage += `\n\n💡 **Tip:** Consider their request again - circumstances may have changed!`

    await notificationService.sendEnhancedSystemMessage(
      'request',
      'owner',
      userId,
      ownerId,
      ride,
      trip,
      enhancedMessage
    )

    return { success: true }
  } catch (error: any) {
    console.error('Error in requestAgain:', error)
    return { success: false, error: error.message || 'Failed to request again' }
  }
}

/**
 * Handle reversal of accidental cancellations
 */
export const reverseCancellation = async (
  confirmationId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get the existing confirmation
    const { data: confirmation, error: fetchError } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        car_rides!ride_confirmations_ride_id_fkey (
          id,
          from_location,
          to_location,
          departure_date_time,
          user_id
        ),
        trips!ride_confirmations_trip_id_fkey (
          id,
          leaving_airport,
          destination_airport,
          travel_date,
          user_id
        )
      `)
      .eq('id', confirmationId)
      .or(`ride_owner_id.eq.${userId},passenger_id.eq.${userId}`)
      .single()

    if (fetchError || !confirmation) {
      return { success: false, error: 'Confirmation not found or access denied' }
    }

    if (confirmation.status !== 'rejected') {
      return { success: false, error: 'Can only reverse cancelled/rejected confirmations' }
    }

    // Check if the cancellation was recent (within 24 hours)
    const cancelledAt = new Date(confirmation.confirmed_at || confirmation.updated_at)
    const now = new Date()
    const hoursSinceCancellation = (now.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60)

    if (hoursSinceCancellation > 24) {
      return { success: false, error: 'Cannot reverse cancellations older than 24 hours' }
    }

    // Check if the ride/trip is still in the future
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    const departureTime = ride ? ride.departure_date_time : trip?.travel_date

    if (departureTime && new Date(departureTime) <= new Date()) {
      return { success: false, error: 'Cannot reverse cancellation for past rides/trips' }
    }

    // Restore the confirmation to accepted status
    const { error: updateError } = await supabase
      .from('ride_confirmations')
      .update({
        status: 'accepted',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', confirmationId)

    if (updateError) {
      return { success: false, error: 'Failed to reverse cancellation' }
    }

    // Determine who to notify
    const isOwner = confirmation.ride_owner_id === userId
    const notifyUserId = isOwner ? confirmation.passenger_id : confirmation.ride_owner_id
    const userRole = isOwner ? 'passenger' : 'owner'

    // Send enhanced system message
    let enhancedMessage = `🔄 **Cancellation Reversed**\n\nGreat news! The ${ride ? 'car ride' : 'airport trip'} that was previously cancelled has been restored.`
    
    if (reason) {
      enhancedMessage += `\n\n💬 **Reason for Reversal:** "${reason}"`
    }
    
    enhancedMessage += `\n\n✅ **Status:** Your confirmation is now active again. Please coordinate pickup details as planned.`

    await notificationService.sendEnhancedSystemMessage(
      'accept',
      userRole,
      userId,
      notifyUserId,
      ride,
      trip,
      enhancedMessage
    )

    return { success: true }
  } catch (error: any) {
    console.error('Error in reverseCancellation:', error)
    return { success: false, error: error.message || 'Failed to reverse cancellation' }
  }
}

/**
 * Check and expire old pending confirmations
 */
export const expireOldConfirmations = async (
  settings: ExpirySettings = {
    pendingExpiryHours: 72, // 3 days
    acceptedExpiryDays: 30, // 30 days
    enableAutoExpiry: true
  }
): Promise<{ expiredCount: number; errors: string[] }> => {
  if (!settings.enableAutoExpiry) {
    return { expiredCount: 0, errors: [] }
  }

  const errors: string[] = []
  let expiredCount = 0

  try {
    const now = new Date()
    
    // Calculate expiry dates
    const pendingExpiryDate = new Date(now.getTime() - settings.pendingExpiryHours * 60 * 60 * 1000)
    const acceptedExpiryDate = new Date(now.getTime() - settings.acceptedExpiryDays * 24 * 60 * 60 * 1000)

    // Find expired pending confirmations
    const { data: expiredPending, error: pendingError } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        user_profiles!ride_confirmations_passenger_id_fkey (
          id,
          full_name
        ),
        car_rides!ride_confirmations_ride_id_fkey (
          id,
          from_location,
          to_location,
          departure_date_time,
          user_id
        ),
        trips!ride_confirmations_trip_id_fkey (
          id,
          leaving_airport,
          destination_airport,
          travel_date,
          user_id
        )
      `)
      .eq('status', 'pending')
      .lt('created_at', pendingExpiryDate.toISOString())

    if (pendingError) {
      errors.push(`Error fetching expired pending confirmations: ${pendingError.message}`)
    } else if (expiredPending && expiredPending.length > 0) {
      // Update expired pending confirmations
      const { error: expireError } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', expiredPending.map(c => c.id))

      if (expireError) {
        errors.push(`Error expiring pending confirmations: ${expireError.message}`)
      } else {
        expiredCount += expiredPending.length

        // Send notifications to passengers about expired requests
        for (const confirmation of expiredPending) {
          try {
            const ride = confirmation.car_rides
            const trip = confirmation.trips
            
            const expiredMessage = `⏰ **Request Expired**\n\nYour request for the ${ride ? 'car ride' : 'airport trip'} has expired after ${settings.pendingExpiryHours} hours without a response.\n\n🔄 **You can request again** if you're still interested in joining this ${ride ? 'ride' : 'trip'}.\n\n💡 **Tip:** Try reaching out to the ${ride ? 'driver' : 'traveler'} directly through chat to discuss your request.`

            await notificationService.sendEnhancedSystemMessage(
              'reject',
              'passenger',
              confirmation.ride_owner_id,
              confirmation.passenger_id,
              ride,
              trip,
              expiredMessage
            )
          } catch (notificationError) {
            console.error('Error sending expiry notification:', notificationError)
          }
        }
      }
    }

    // Find expired accepted confirmations (for cleanup)
    const { data: expiredAccepted, error: acceptedError } = await supabase
      .from('ride_confirmations')
      .select('id')
      .eq('status', 'accepted')
      .lt('confirmed_at', acceptedExpiryDate.toISOString())

    if (acceptedError) {
      errors.push(`Error fetching expired accepted confirmations: ${acceptedError.message}`)
    } else if (expiredAccepted && expiredAccepted.length > 0) {
      // For accepted confirmations, we might want to archive them instead of deleting
      // This is optional and depends on business requirements
      console.log(`Found ${expiredAccepted.length} old accepted confirmations that could be archived`)
    }

    return { expiredCount, errors }
  } catch (error: any) {
    console.error('Error in expireOldConfirmations:', error)
    return { expiredCount: 0, errors: [error.message || 'Failed to expire confirmations'] }
  }
}

/**
 * Get confirmation history with reversal options
 */
export const getConfirmationHistory = async (
  userId: string,
  includeReversalOptions: boolean = true
): Promise<{
  confirmations: (RideConfirmation & { canRequestAgain?: boolean; canReverse?: boolean })[]
  error?: string
}> => {
  try {
    const { data: confirmations, error } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        user_profiles!ride_confirmations_passenger_id_fkey (
          id,
          full_name,
          profile_image_url
        ),
        car_rides!ride_confirmations_ride_id_fkey (
          id,
          from_location,
          to_location,
          departure_date_time,
          price,
          currency,
          user_id
        ),
        trips!ride_confirmations_trip_id_fkey (
          id,
          leaving_airport,
          destination_airport,
          travel_date,
          price,
          currency,
          user_id
        )
      `)
      .or(`ride_owner_id.eq.${userId},passenger_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      return { confirmations: [], error: error.message }
    }

    if (!includeReversalOptions) {
      return { confirmations: confirmations || [] }
    }

    // Add reversal options to each confirmation
    const enhancedConfirmations = (confirmations || []).map(confirmation => {
      const now = new Date()
      const ride = confirmation.car_rides
      const trip = confirmation.trips
      const departureTime = ride ? ride.departure_date_time : trip?.travel_date
      const isFutureRide = departureTime ? new Date(departureTime) > now : false

      // Check if user can request again (for rejected confirmations)
      const canRequestAgain = 
        confirmation.status === 'rejected' &&
        confirmation.passenger_id === userId &&
        isFutureRide

      // Check if user can reverse cancellation (within 24 hours)
      const canReverse = 
        confirmation.status === 'rejected' &&
        confirmation.confirmed_at &&
        isFutureRide &&
        (now.getTime() - new Date(confirmation.confirmed_at).getTime()) < (24 * 60 * 60 * 1000)

      return {
        ...confirmation,
        canRequestAgain,
        canReverse
      }
    })

    return { confirmations: enhancedConfirmations }
  } catch (error: any) {
    console.error('Error fetching confirmation history:', error)
    return { confirmations: [], error: error.message || 'Failed to fetch confirmation history' }
  }
}

/**
 * Check if a confirmation can be reversed
 */
export const canReverseConfirmation = (
  confirmation: RideConfirmation,
  userId: string
): { canReverse: boolean; reason?: string } => {
  const now = new Date()

  // Must be rejected status
  if (confirmation.status !== 'rejected') {
    return { canReverse: false, reason: 'Only rejected confirmations can be reversed' }
  }

  // Must be within 24 hours of cancellation
  const cancelledAt = new Date(confirmation.confirmed_at || confirmation.updated_at)
  const hoursSinceCancellation = (now.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceCancellation > 24) {
    return { canReverse: false, reason: 'Cannot reverse cancellations older than 24 hours' }
  }

  // Must be for future rides/trips
  const ride = confirmation.car_rides
  const trip = confirmation.trips
  const departureTime = ride ? ride.departure_date_time : trip?.travel_date

  if (departureTime && new Date(departureTime) <= now) {
    return { canReverse: false, reason: 'Cannot reverse for past rides/trips' }
  }

  // User must be involved in the confirmation
  if (confirmation.ride_owner_id !== userId && confirmation.passenger_id !== userId) {
    return { canReverse: false, reason: 'Access denied' }
  }

  return { canReverse: true }
}

/**
 * Get expiry information for a confirmation
 */
export const getConfirmationExpiryInfo = (
  confirmation: RideConfirmation,
  settings: ExpirySettings = {
    pendingExpiryHours: 72,
    acceptedExpiryDays: 30,
    enableAutoExpiry: true
  }
): {
  willExpire: boolean
  expiryDate?: Date
  timeUntilExpiry?: string
  isExpired: boolean
} => {
  if (!settings.enableAutoExpiry) {
    return { willExpire: false, isExpired: false }
  }

  const now = new Date()
  let expiryDate: Date

  if (confirmation.status === 'pending') {
    expiryDate = new Date(
      new Date(confirmation.created_at).getTime() + settings.pendingExpiryHours * 60 * 60 * 1000
    )
  } else if (confirmation.status === 'accepted' && confirmation.confirmed_at) {
    expiryDate = new Date(
      new Date(confirmation.confirmed_at).getTime() + settings.acceptedExpiryDays * 24 * 60 * 60 * 1000
    )
  } else {
    return { willExpire: false, isExpired: false }
  }

  const isExpired = now > expiryDate
  const timeUntilExpiry = isExpired ? undefined : getTimeUntilExpiry(now, expiryDate)

  return {
    willExpire: true,
    expiryDate,
    timeUntilExpiry,
    isExpired
  }
}

/**
 * Format time until expiry in human-readable format
 */
const getTimeUntilExpiry = (now: Date, expiryDate: Date): string => {
  const diffMs = expiryDate.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24)
    return `${days} day${days !== 1 ? 's' : ''}`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
  } else {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
  }
}

/**
 * Batch expire confirmations (for scheduled tasks)
 */
export const batchExpireConfirmations = async (
  settings?: ExpirySettings
): Promise<{ success: boolean; expiredCount: number; errors: string[] }> => {
  try {
    const result = await expireOldConfirmations(settings)
    return {
      success: result.errors.length === 0,
      expiredCount: result.expiredCount,
      errors: result.errors
    }
  } catch (error: any) {
    return {
      success: false,
      expiredCount: 0,
      errors: [error.message || 'Failed to batch expire confirmations']
    }
  }
}

/**
 * Get confirmation statistics including reversal and expiry data
 */
export const getConfirmationStats = async (
  userId: string
): Promise<{
  total: number
  pending: number
  accepted: number
  rejected: number
  canRequestAgain: number
  canReverse: number
  expiringSoon: number
}> => {
  try {
    const { confirmations } = await getConfirmationHistory(userId, true)
    
    const stats = {
      total: confirmations.length,
      pending: confirmations.filter(c => c.status === 'pending').length,
      accepted: confirmations.filter(c => c.status === 'accepted').length,
      rejected: confirmations.filter(c => c.status === 'rejected').length,
      canRequestAgain: confirmations.filter(c => c.canRequestAgain).length,
      canReverse: confirmations.filter(c => c.canReverse).length,
      expiringSoon: 0
    }

    // Count confirmations expiring within 24 hours
    stats.expiringSoon = confirmations.filter(confirmation => {
      const expiryInfo = getConfirmationExpiryInfo(confirmation)
      if (!expiryInfo.willExpire || expiryInfo.isExpired) return false
      
      const hoursUntilExpiry = expiryInfo.expiryDate 
        ? (expiryInfo.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60)
        : 0
      
      return hoursUntilExpiry <= 24
    }).length

    return stats
  } catch (error: any) {
    console.error('Error getting confirmation stats:', error)
    return {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      canRequestAgain: 0,
      canReverse: 0,
      expiringSoon: 0
    }
  }
}