import { supabase } from './supabase'
import { notificationService } from './notificationService'
import { CarRide, Trip, RideConfirmation } from '../types'
import { retryWithBackoff, validateConfirmationFlow } from './errorUtils'
import { getUserDisplayName } from './messageTemplates'

/**
 * Check if a user can request again for a specific ride/trip
 */
export const canRequestAgain = async (
  userId: string,
  rideId?: string,
  tripId?: string
): Promise<{ canRequest: boolean; reason?: string; lastRejection?: Date; cooldownMinutes?: number }> => {
  return retryWithBackoff(async () => {
    let query = supabase
      .from('ride_confirmations')
      .select('*')
      .eq('passenger_id', userId)

    if (rideId) {
      query = query.eq('ride_id', rideId)
    } else if (tripId) {
      query = query.eq('trip_id', tripId)
    } else {
      return { canRequest: false, reason: 'No ride or trip specified' }
    }

    const { data: confirmations, error } = await query.order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    if (!confirmations || confirmations.length === 0) {
      return { canRequest: true }
    }

    const latestConfirmation = confirmations[0]
    
    // If there's a pending or accepted confirmation, can't request again
    if (latestConfirmation.status === 'pending') {
      return { canRequest: false, reason: 'You already have a pending request for this ride' }
    }
    
    if (latestConfirmation.status === 'accepted') {
      return { canRequest: false, reason: 'You are already confirmed for this ride' }
    }

    // If rejected, check cooldown period (30 minutes minimum between requests)
    if (latestConfirmation.status === 'rejected') {
      const lastRejection = new Date(latestConfirmation.updated_at)
      const minutesSinceRejection = (new Date().getTime() - lastRejection.getTime()) / (1000 * 60)
      const cooldownMinutes = 30
      
      if (minutesSinceRejection < cooldownMinutes) {
        const remainingMinutes = Math.ceil(cooldownMinutes - minutesSinceRejection)
        return { 
          canRequest: false, 
          reason: `Please wait ${remainingMinutes} more minutes before requesting again`,
          lastRejection,
          cooldownMinutes: remainingMinutes
        }
      }
      
      return { canRequest: true, lastRejection }
    }

    return { canRequest: true }
  })
}

/**
 * Handle "Request Again" functionality for rejected confirmations
 */
export const requestAgain = async (
  confirmationId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    // First, verify the confirmation exists and is rejected
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
      .eq('status', 'rejected')
      .single()

    if (fetchError || !confirmation) {
      return { success: false, error: 'Confirmation not found or not eligible for re-request' }
    }

    // Check if the ride/trip is still in the future
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    const departureTime = ride ? new Date(ride.departure_date_time) : new Date(trip?.travel_date || '')
    
    if (departureTime <= new Date()) {
      return { success: false, error: 'Cannot request again for past rides/trips' }
    }

    // Check cooldown period
    const eligibility = await canRequestAgain(
      userId,
      confirmation.ride_id || undefined,
      confirmation.trip_id || undefined
    )
    
    if (!eligibility.canRequest) {
      return { success: false, error: eligibility.reason || 'Cannot request again at this time' }
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
    await notificationService.sendEnhancedSystemMessage(
      'request',
      'owner',
      userId,
      ownerId,
      ride,
      trip,
      `Re-request after rejection${reason ? `. Reason: ${reason}` : ''}`
    )

    return { success: true }
  })
}

/**
 * Handle reversal of accidental cancellations/rejections
 */
export const reverseAction = async (
  confirmationId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    // Check eligibility first
    const eligibility = await getReversalEligibility(confirmationId, userId)
    
    if (!eligibility.canReverse) {
      return { success: false, error: eligibility.reason || 'Cannot reverse this action' }
    }

    // Get confirmation details
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
      .single()

    if (fetchError || !confirmation) {
      return { success: false, error: 'Confirmation not found' }
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
      return { success: false, error: 'Failed to reverse action' }
    }

    // Determine user roles and send appropriate message
    const isOwner = confirmation.ride_owner_id === userId
    const receiverId = isOwner ? confirmation.passenger_id : confirmation.ride_owner_id
    const userRole = isOwner ? 'owner' : 'passenger'
    const oppositeRole = isOwner ? 'passenger' : 'owner'
    
    await notificationService.sendEnhancedSystemMessage(
      'accept',
      oppositeRole,
      userId,
      receiverId,
      confirmation.car_rides,
      confirmation.trips,
      `Action reversed${reason ? `. Reason: ${reason}` : ''}`
    )

    return { success: true }
  })
}

/**
 * Get reversal eligibility for a confirmation
 */
export const getReversalEligibility = async (
  confirmationId: string,
  userId: string
): Promise<{
  canReverse: boolean
  reason?: string
  timeRemaining?: number
  reversalType?: 'cancellation' | 'rejection'
}> => {
  return retryWithBackoff(async () => {
    const { data: confirmation, error } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        car_rides!ride_confirmations_ride_id_fkey (
          departure_date_time
        ),
        trips!ride_confirmations_trip_id_fkey (
          travel_date
        )
      `)
      .eq('id', confirmationId)
      .single()

    if (error || !confirmation) {
      return { canReverse: false, reason: 'Confirmation not found' }
    }

    // Check user permission
    const isOwner = confirmation.ride_owner_id === userId
    const isPassenger = confirmation.passenger_id === userId

    if (!isOwner && !isPassenger) {
      return { canReverse: false, reason: 'You do not have permission to reverse this action' }
    }

    // Check if confirmation is in a reversible state
    if (confirmation.status !== 'rejected') {
      return { canReverse: false, reason: 'Only rejected confirmations can be reversed' }
    }

    // Check time limits (24 hours for reversal)
    const updatedAt = new Date(confirmation.updated_at)
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)

    if (hoursSinceUpdate > 24) {
      return { canReverse: false, reason: 'Reversal period has expired (24 hours)' }
    }

    // Check if the ride/trip is still in the future
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    const departureTime = ride ? new Date(ride.departure_date_time) : new Date(trip?.travel_date || '')
    
    if (departureTime <= new Date()) {
      return { canReverse: false, reason: 'Cannot reverse for past rides/trips' }
    }

    const timeRemaining = 24 - hoursSinceUpdate
    const reversalType = isOwner ? 'rejection' : 'cancellation'

    return {
      canReverse: true,
      timeRemaining,
      reversalType
    }
  })
}

/**
 * Check if a specific confirmation has expired
 */
export const checkConfirmationExpiry = async (
  confirmationId: string
): Promise<{
  isExpired: boolean
  timeUntilExpiry?: number
  expiryDate?: Date
  reason?: string
}> => {
  return retryWithBackoff(async () => {
    const { data: confirmation, error } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        car_rides!ride_confirmations_ride_id_fkey (
          departure_date_time
        ),
        trips!ride_confirmations_trip_id_fkey (
          travel_date
        )
      `)
      .eq('id', confirmationId)
      .single()

    if (error || !confirmation) {
      return { isExpired: false, reason: 'Confirmation not found' }
    }

    // Only check pending confirmations
    if (confirmation.status !== 'pending') {
      return { isExpired: false, reason: 'Confirmation is not pending' }
    }

    const ride = confirmation.car_rides
    const trip = confirmation.trips
    const departureTime = ride ? new Date(ride.departure_date_time) : new Date(trip?.travel_date || '')
    
    // Check if the ride/trip is in the past
    const now = new Date()
    if (departureTime <= now) {
      return { 
        isExpired: true, 
        expiryDate: departureTime,
        reason: 'Ride/trip departure time has passed' 
      }
    }

    // Calculate expiry time based on ride type
    // Car rides: expire 2 hours before departure
    // Airport trips: expire 4 hours before departure
    const expiryHours = ride ? 2 : 4
    const expiryDate = new Date(departureTime.getTime() - (expiryHours * 60 * 60 * 1000))
    
    const isExpired = now >= expiryDate
    const timeUntilExpiry = isExpired ? 0 : (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    return {
      isExpired,
      timeUntilExpiry: isExpired ? 0 : timeUntilExpiry,
      expiryDate,
      reason: isExpired ? `Confirmation expired ${expiryHours} hours before departure` : undefined
    }
  })
}

/**
 * Auto-expire old pending confirmations
 */
export const expirePendingConfirmations = async (): Promise<{ expiredCount: number }> => {
  return retryWithBackoff(async () => {
    // Get all pending confirmations
    const { data: pendingConfirmations, error: fetchError } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        car_rides!ride_confirmations_ride_id_fkey (
          departure_date_time
        ),
        trips!ride_confirmations_trip_id_fkey (
          travel_date
        )
      `)
      .eq('status', 'pending')

    if (fetchError) {
      throw fetchError
    }

    const now = new Date()
    const expiredConfirmations: string[] = []

    for (const confirmation of pendingConfirmations || []) {
      const ride = confirmation.car_rides
      const trip = confirmation.trips
      const departureTime = ride ? new Date(ride.departure_date_time) : new Date(trip?.travel_date || '')
      
      // Check if confirmation has expired
      const expiryHours = ride ? 2 : 4
      const expiryDate = new Date(departureTime.getTime() - (expiryHours * 60 * 60 * 1000))
      
      if (now >= expiryDate) {
        expiredConfirmations.push(confirmation.id)
      }
    }

    // Expire the confirmations
    if (expiredConfirmations.length > 0) {
      const { error: updateError } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', expiredConfirmations)

      if (updateError) {
        throw updateError
      }

      // Send system messages for expired confirmations
      for (const confirmationId of expiredConfirmations) {
        const confirmation = pendingConfirmations?.find(c => c.id === confirmationId)
        if (confirmation) {
          const ride = confirmation.car_rides
          const trip = confirmation.trips
          
          // Notify passenger about expiry
          await notificationService.sendEnhancedSystemMessage(
            'reject',
            'passenger',
            'system',
            confirmation.passenger_id,
            ride,
            trip,
            'Request expired due to proximity to departure time'
          )
        }
      }
    }

    return { expiredCount: expiredConfirmations.length }
  })
}

/**
 * Automatically expire confirmations that have passed their deadline
 */
export const autoExpireConfirmations = async (): Promise<{ 
  processed: number
  expired: number
  errors: string[]
}> => {
  return retryWithBackoff(async () => {
    console.log('Starting automatic confirmation expiry process...')
    
    const { data: pendingConfirmations, error: fetchError } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        car_rides!ride_confirmations_ride_id_fkey (
          id,
          departure_date_time,
          from_location,
          to_location
        ),
        trips!ride_confirmations_trip_id_fkey (
          id,
          travel_date,
          leaving_airport,
          destination_airport
        ),
        user_profiles!ride_confirmations_passenger_id_fkey (
          id,
          full_name
        )
      `)
      .eq('status', 'pending')

    if (fetchError) {
      throw fetchError
    }

    const now = new Date()
    const expiredIds: string[] = []
    const errors: string[] = []
    const processed = pendingConfirmations?.length || 0

    console.log(`Found ${processed} pending confirmations to check`)

    for (const confirmation of pendingConfirmations || []) {
      try {
        const ride = confirmation.car_rides
        const trip = confirmation.trips
        const departureTime = ride ? new Date(ride.departure_date_time) : new Date(trip?.travel_date || '')
        
        // Calculate expiry time based on ride type
        const expiryHours = ride ? 2 : 4
        const expiryDate = new Date(departureTime.getTime() - (expiryHours * 60 * 60 * 1000))
        
        // Check if confirmation has expired
        if (now >= expiryDate) {
          console.log(`Confirmation ${confirmation.id} has expired (${expiryHours}h before departure)`)
          expiredIds.push(confirmation.id)
        }
      } catch (error: any) {
        errors.push(`Error processing confirmation ${confirmation.id}: ${error.message}`)
      }
    }

    console.log(`Found ${expiredIds.length} expired confirmations`)

    // Expire confirmations in batch
    if (expiredIds.length > 0) {
      try {
        const { error: updateError } = await supabase
          .from('ride_confirmations')
          .update({
            status: 'rejected',
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', expiredIds)

        if (updateError) {
          errors.push(`Error expiring confirmations: ${updateError.message}`)
        }

        // Send system messages for expired confirmations
        for (const confirmationId of expiredIds) {
          const confirmation = pendingConfirmations?.find(c => c.id === confirmationId)
          if (confirmation) {
            const ride = confirmation.car_rides
            const trip = confirmation.trips
            
            // Notify passenger about expiry
            await notificationService.sendEnhancedSystemMessage(
              'reject',
              'passenger',
              'system',
              confirmation.passenger_id,
              ride,
              trip,
              'Request expired due to proximity to departure time'
            )
          }
        }
      } catch (error: any) {
        errors.push(`Error processing expired confirmations: ${error.message}`)
      }
      }
    }

    console.log(`Expired ${expiredIds.length} confirmations`)

    return {
      processed,
      expired: expiredIds.length,
      errors
    }
  })
}

/**
 * Get confirmation statistics including expiry information
 */
export const getConfirmationStats = async (
  userId: string
): Promise<{
  total: number
  pending: number
  accepted: number
  rejected: number
  expiringSoon: number
  expired: number
}> => {
  return retryWithBackoff(async () => {
    const { data: confirmations, error } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        car_rides!ride_confirmations_ride_id_fkey (
          departure_date_time
        ),
        trips!ride_confirmations_trip_id_fkey (
          travel_date
        )
      `)
      .or(`ride_owner_id.eq.${userId},passenger_id.eq.${userId}`)

    if (error) {
      throw error
    }

    const now = new Date()
    let expiringSoon = 0
    let expired = 0

    for (const confirmation of confirmations || []) {
      if (confirmation.status === 'pending') {
        const ride = confirmation.car_rides
        const trip = confirmation.trips
        const departureTime = ride ? new Date(ride.departure_date_time) : new Date(trip?.travel_date || '')
        
        const expiryHours = ride ? 2 : 4
        const expiryDate = new Date(departureTime.getTime() - (expiryHours * 60 * 60 * 1000))
        const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        
        if (now >= expiryDate) {
          expired++
        } else if (hoursUntilExpiry <= 24) {
          expiringSoon++
        }
      }
    }

    return {
      total: confirmations?.length || 0,
      pending: confirmations?.filter(c => c.status === 'pending').length || 0,
      accepted: confirmations?.filter(c => c.status === 'accepted').length || 0,
      rejected: confirmations?.filter(c => c.status === 'rejected').length || 0,
      expiringSoon,
      expired
    }
  })
}

/**
 * Batch process expired confirmations (to be called periodically)
 */
export const batchExpireConfirmations = async (): Promise<{
  processed: number
  expired: number
  errors: string[]
}> => {
  return retryWithBackoff(async () => {
    const { data: pendingConfirmations, error: fetchError } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        car_rides!ride_confirmations_ride_id_fkey (
          departure_date_time
        ),
        trips!ride_confirmations_trip_id_fkey (
          travel_date
        )
      `)
      .eq('status', 'pending')

    if (fetchError) {
      throw fetchError
    }

    const now = new Date()
    const expiredIds: string[] = []
    const errors: string[] = []

    for (const confirmation of pendingConfirmations || []) {
      try {
        const expiry = await checkConfirmationExpiry(confirmation.id)
        if (expiry.isExpired) {
          expiredIds.push(confirmation.id)
        }
      } catch (error: any) {
        errors.push(`Error checking confirmation ${confirmation.id}: ${error.message}`)
      }
    }

    // Expire the confirmations in batch
    if (expiredIds.length > 0) {
      const { error: updateError } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', expiredIds)

      if (updateError) {
        errors.push(`Error expiring confirmations: ${updateError.message}`)
      }
    }

    return {
      processed: pendingConfirmations?.length || 0,
      expired: expiredIds.length,
      errors
    }
  })
}