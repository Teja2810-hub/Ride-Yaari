import { supabase } from './supabase'
import { notificationService, SYSTEM_USER_ID } from './notificationService'
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
    console.log('canRequestAgain called:', { userId, rideId, tripId })
    
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

    console.log('canRequestAgain: Found confirmations:', confirmations?.length || 0)

    if (!confirmations || confirmations.length === 0) {
      console.log('canRequestAgain: No existing confirmations, can request')
      return { canRequest: true }
    }

    const latestConfirmation = confirmations[0]
    console.log('canRequestAgain: Latest confirmation status:', latestConfirmation.status)
    
    // If there's a pending or accepted confirmation, can't request again
    if (latestConfirmation.status === 'pending') {
      console.log('canRequestAgain: Already has pending request')
      return { canRequest: false, reason: 'You already have a pending request for this ride' }
    }
    
    if (latestConfirmation.status === 'accepted') {
      console.log('canRequestAgain: Already confirmed for this ride')
      return { canRequest: false, reason: 'You are already confirmed for this ride' }
    }

    // If rejected, check cooldown period (30 minutes minimum between requests)
    if (latestConfirmation.status === 'rejected') {
      const lastRejection = new Date(latestConfirmation.updated_at)
      const minutesSinceRejection = (new Date().getTime() - lastRejection.getTime()) / (1000 * 60)
      const cooldownMinutes = 30
      
      console.log('canRequestAgain: Checking cooldown', { 
        lastRejection: lastRejection.toISOString(), 
        minutesSinceRejection, 
        cooldownMinutes 
      })
      
      if (minutesSinceRejection < cooldownMinutes) {
        const remainingMinutes = Math.ceil(cooldownMinutes - minutesSinceRejection)
        console.log('canRequestAgain: Still in cooldown period, remaining minutes:', remainingMinutes)
        return { 
          canRequest: false, 
          reason: `Please wait ${remainingMinutes} more minutes before requesting again`,
          lastRejection,
          cooldownMinutes: remainingMinutes
        }
      }
      
      console.log('canRequestAgain: Cooldown period passed, can request again')
      return { canRequest: true, lastRejection }
    }

    console.log('canRequestAgain: Default case, can request')
    return { canRequest: true }
  })
}

/**
 * Handle "Request Again" functionality for rejected confirmations
 */
export const requestAgain = async (
  confirmationId: string,
  userId: string,
  rideOwnerId: string,
  ride?: CarRide,
  trip?: Trip,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    console.log('requestAgain called:', { confirmationId, userId, rideOwnerId, reason })
    
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
      console.log('requestAgain: Confirmation not found or not eligible', { fetchError, confirmation })
      return { success: false, error: 'Confirmation not found or not eligible for re-request' }
    }

    console.log('requestAgain: Found confirmation:', confirmation.id)

    // Check if the ride/trip is still in the future
    const confirmationRide = confirmation.car_rides
    const confirmationTrip = confirmation.trips
    const departureTime = confirmationRide ? new Date(confirmationRide.departure_date_time) : new Date(confirmationTrip?.travel_date || '')
    
    console.log('requestAgain: Checking departure time', { 
      departureTime: departureTime.toISOString(), 
      now: new Date().toISOString(),
      isPast: departureTime <= new Date()
    })
    
    if (departureTime <= new Date()) {
      console.log('requestAgain: Cannot request for past rides/trips')
      return { success: false, error: 'Cannot request again for past rides/trips' }
    }

    // Check cooldown period
    const eligibility = await canRequestAgain(
      userId,
      confirmation.ride_id || undefined,
      confirmation.trip_id || undefined
    )
    
    console.log('requestAgain: Cooldown eligibility check result:', eligibility)
    
    if (!eligibility.canRequest) {
      console.log('requestAgain: Not eligible due to cooldown')
      return { success: false, error: eligibility.reason || 'Cannot request again at this time' }
    }

    // Update the confirmation status back to pending
    console.log('requestAgain: Updating confirmation status to pending')
    const { error: updateError } = await supabase
      .from('ride_confirmations')
      .update({
        status: 'pending',
        confirmed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', confirmationId)
      .eq('passenger_id', userId) // Additional security check
      .eq('status', 'rejected') // Only update if still rejected

    if (updateError) {
      console.error('requestAgain: Error updating confirmation status:', updateError)
      return { success: false, error: 'Failed to update confirmation status' }
    }

    console.log('requestAgain: Confirmation status updated successfully')

    // Get passenger name for system message
    const passengerName = await getUserDisplayName(userId)
    
    // Send system message to ride owner
    const rideDetails = ride 
      ? `car ride from ${ride.from_location} to ${ride.to_location}`
      : trip 
        ? `airport trip from ${trip.leaving_airport} to ${trip.destination_airport}`
        : confirmationRide 
          ? `car ride from ${confirmationRide.from_location} to ${confirmationRide.to_location}`
          : confirmationTrip 
            ? `airport trip from ${confirmationTrip.leaving_airport} to ${confirmationTrip.destination_airport}`
            : 'ride'

    console.log('requestAgain: Sending system message to ride owner')
    await supabase
      .from('chat_messages')
      .insert({
        sender_id: userId,
        receiver_id: rideOwnerId,
        message_content: `🔄 ${passengerName} has re-requested to join your ${rideDetails}${reason ? `. Additional message: ${reason}` : ''}. Please review and respond.`,
        message_type: 'system',
        is_read: false
      })

    // Also send enhanced system message for notifications
    console.log('requestAgain: Sending enhanced system message for notifications')
    await notificationService.sendEnhancedSystemMessage(
      'request',
      'passenger',
      userId,
      rideOwnerId,
      ride || confirmationRide,
      trip || confirmationTrip,
      `Re-request after rejection${reason ? `. Reason: ${reason}` : ''}`
    )

    console.log('requestAgain: All operations completed successfully')
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
    console.log('reverseAction: Starting reversal process', { confirmationId, userId, reason })
    
    // Check eligibility first
    const eligibility = await getReversalEligibility(confirmationId, userId)
    
    console.log('reverseAction: Eligibility check result:', eligibility)
    
    if (!eligibility.canReverse) {
      console.log('reverseAction: Not eligible for reversal:', eligibility.reason)
      return { success: false, error: eligibility.reason || 'Cannot reverse this action' }
    }

    // Get confirmation details
    const { data: confirmation, error: fetchError } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        user_profiles!ride_confirmations_passenger_id_fkey (
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
      .eq('id', confirmationId)
      .single()

    if (fetchError || !confirmation) {
      console.log('reverseAction: Failed to fetch confirmation:', fetchError)
      return { success: false, error: 'Confirmation not found' }
    }

    console.log('reverseAction: Found confirmation for reversal:', {
      id: confirmation.id.slice(0, 8),
      status: confirmation.status,
      rideOwnerId: confirmation.ride_owner_id.slice(0, 8),
      passengerId: confirmation.passenger_id.slice(0, 8)
    })

    // Restore the confirmation to accepted status
    console.log('reverseAction: Updating confirmation status to accepted')
    const { error: updateError } = await supabase
      .from('ride_confirmations')
      .update({
        status: 'accepted',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', confirmationId)
      .eq('status', 'rejected') // Additional safety check

    if (updateError) {
      console.error('reverseAction: Failed to update confirmation status:', updateError)
      return { success: false, error: 'Failed to reverse action' }
    }

    console.log('reverseAction: Confirmation status updated successfully')

    // Determine user roles and send appropriate message
    const isOwner = confirmation.ride_owner_id === userId
    const receiverId = isOwner ? confirmation.passenger_id : confirmation.ride_owner_id
    const senderRole = isOwner ? 'owner' : 'passenger'
    const receiverRole = isOwner ? 'passenger' : 'owner'
    
    // Get user names for the system message
    const senderName = await getUserDisplayName(userId)
    const passengerName = confirmation.user_profiles?.full_name || await getUserDisplayName(confirmation.passenger_id)
    
    // Send enhanced system message about the reversal
    console.log('reverseAction: Sending system message about reversal')
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    const rideDetails = ride 
      ? `car ride from ${ride.from_location} to ${ride.to_location}`
      : trip 
        ? `airport trip from ${trip.leaving_airport} to ${trip.destination_airport}`
        : 'ride'
    
    const reversalMessage = eligibility.reversalType === 'cancellation'
      ? `🔄 ${senderName} has reversed their cancellation of the ${rideDetails}. The ride is confirmed again and you can proceed with the original arrangements.${reason ? ` Reason: ${reason}` : ''}`
      : `🔄 ${senderName} has reversed their rejection and accepted your request for the ${rideDetails}. You are now confirmed for this ride!${reason ? ` Message: ${reason}` : ''}`
    
    await supabase
      .from('chat_messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        message_content: reversalMessage,
        message_type: 'system',
        is_read: false
      })
    
    console.log('reverseAction: System message sent successfully')
    
    // Send notification to the other party
    try {
      await notificationService.sendEnhancedSystemMessage(
        'accept',
        receiverRole,
        userId,
        receiverId,
        ride,
        trip,
        `Action reversed${reason ? `. Reason: ${reason}` : ''}`
      )
      console.log('reverseAction: Enhanced notification sent successfully')
    } catch (notificationError) {
      console.warn('reverseAction: Failed to send enhanced notification:', notificationError)
      // Don't fail the reversal if notification fails
    }

    console.log('reverseAction: Reversal completed successfully')
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
    console.log('getReversalEligibility: Checking eligibility for confirmation:', confirmationId, 'user:', userId)
    
    const { data: confirmation, error } = await supabase
      .from('ride_confirmations')
      .select(`
        *,
        user_profiles!ride_confirmations_passenger_id_fkey (
          full_name
        ),
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
      console.log('getReversalEligibility: Confirmation not found:', error)
      return { canReverse: false, reason: 'Confirmation not found' }
    }

    console.log('getReversalEligibility: Found confirmation:', {
      id: confirmation.id.slice(0, 8),
      status: confirmation.status,
      rideOwnerId: confirmation.ride_owner_id.slice(0, 8),
      passengerId: confirmation.passenger_id.slice(0, 8),
      updatedAt: confirmation.updated_at
    })

    // Check user permission
    const isOwner = confirmation.ride_owner_id === userId
    const isPassenger = confirmation.passenger_id === userId

    console.log('getReversalEligibility: User role check:', { isOwner, isPassenger })

    if (!isOwner && !isPassenger) {
      console.log('getReversalEligibility: User not involved in confirmation')
      return { canReverse: false, reason: 'You do not have permission to reverse this action' }
    }

    // Check if confirmation is in a reversible state
    if (confirmation.status !== 'rejected') {
      console.log('getReversalEligibility: Confirmation not rejected, status:', confirmation.status)
      return { canReverse: false, reason: 'Only rejected confirmations can be reversed' }
    }

    // Check time limits (24 hours for reversal)
    const updatedAt = new Date(confirmation.updated_at)
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)

    console.log('getReversalEligibility: Time check:', {
      updatedAt: updatedAt.toISOString(),
      now: now.toISOString(),
      hoursSinceUpdate,
      timeLimit: 24
    })

    if (hoursSinceUpdate > 24) {
      console.log('getReversalEligibility: Reversal period expired')
      return { canReverse: false, reason: 'Reversal period has expired (24 hours)' }
    }

    // Check if the ride/trip is still in the future
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    const departureTime = ride ? new Date(ride.departure_date_time) : new Date(trip?.travel_date || '')
    
    console.log('getReversalEligibility: Future check:', {
      departureTime: departureTime.toISOString(),
      now: now.toISOString(),
      isPast: departureTime <= now
    })

    if (departureTime <= new Date()) {
      console.log('getReversalEligibility: Cannot reverse for past rides/trips')
      return { canReverse: false, reason: 'Cannot reverse for past rides/trips' }
    }

    const timeRemaining = 24 - hoursSinceUpdate
    
    // Determine reversal type based on who is requesting and their role
    // If the owner is requesting reversal, they likely rejected a passenger request
    // If the passenger is requesting reversal, they likely cancelled their own confirmed ride
    // However, we need to check the confirmation history to be more accurate
    
    // For now, use a simple heuristic:
    // - If user is owner and confirmation was recently updated, it's likely a rejection
    // - If user is passenger and confirmation was recently updated, it's likely a cancellation
    const reversalType: 'cancellation' | 'rejection' = isPassenger ? 'cancellation' : 'rejection'
    
    console.log('getReversalEligibility: Eligibility result:', {
      canReverse: true,
      timeRemaining,
      reversalType,
      hoursSinceUpdate
    })

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
            SYSTEM_USER_ID,
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
    // Run silently in background - only log errors
    
    // Get current timestamp to ensure we only process each confirmation once
    const processStartTime = new Date().toISOString()
    
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
      .lt('updated_at', processStartTime) // Only process confirmations that haven't been updated recently

    if (fetchError) {
      throw fetchError
    }

    const now = new Date()
    const expiredIds: string[] = []
    const processedConfirmations = new Set<string>()
    const errors: string[] = []
    const processed = pendingConfirmations?.length || 0

    // Only log if there are confirmations to process
    if (processed > 0) {
      console.log(`Background cleanup: checking ${processed} pending confirmations`)
    }

    for (const confirmation of pendingConfirmations || []) {
      try {
        // Skip if already processed in this run
        if (processedConfirmations.has(confirmation.id)) {
          continue
        }
        
        processedConfirmations.add(confirmation.id)
        
        const ride = confirmation.car_rides
        const trip = confirmation.trips
        const departureTime = ride ? new Date(ride.departure_date_time) : new Date(trip?.travel_date || '')
        
        // Calculate expiry time based on ride type
        const expiryHours = ride ? 2 : 4
        const expiryDate = new Date(departureTime.getTime() - (expiryHours * 60 * 60 * 1000))
        
        // Check if confirmation has expired
        if (now >= expiryDate) {
          // Only log expired confirmations for debugging
          console.log(`Background cleanup: expired confirmation ${confirmation.id.slice(0, 8)}... (${expiryHours}h rule)`)
          expiredIds.push(confirmation.id)
        }
      } catch (error: any) {
        errors.push(`Error processing confirmation ${confirmation.id}: ${error.message}`)
      }
    }

    // Only log if there are expired confirmations
    if (expiredIds.length > 0) {
      console.log(`Background cleanup: found ${expiredIds.length} expired confirmations`)
    }

    // Expire confirmations in batch
    if (expiredIds.length > 0) {
      try {
        // First, check if any of these confirmations have already been processed
        const { data: alreadyProcessed } = await supabase
          .from('ride_confirmations')
          .select('id, status')
          .in('id', expiredIds)
          .neq('status', 'pending')
        
        // Filter out already processed confirmations
        const stillPendingIds = expiredIds.filter(id => 
          !alreadyProcessed?.some(processed => processed.id === id)
        )
        
        if (stillPendingIds.length === 0) {
          return { processed, expired: 0, errors }
        }
        
        const { error: updateError } = await supabase
          .from('ride_confirmations')
          .update({
            status: 'rejected',
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', stillPendingIds)
          .eq('status', 'pending') // Additional safety check

        if (updateError) {
          errors.push(`Error expiring confirmations: ${updateError.message}`)
          return { processed, expired: 0, errors }
        }

        // Send system messages for expired confirmations (only once per confirmation)
        for (const confirmationId of stillPendingIds) {
          const confirmation = pendingConfirmations?.find(c => c.id === confirmationId)
          if (confirmation) {
            const ride = confirmation.car_rides
            const trip = confirmation.trips
            
            try {
              // Check if we've already sent an expiry message for this confirmation
              const { data: existingMessages } = await supabase
                .from('chat_messages')
                .select('id')
                .eq('sender_id', SYSTEM_USER_ID)
                .eq('receiver_id', confirmation.passenger_id)
                .ilike('message_content', '%Request expired due to proximity to departure time%')
                .limit(1)
              
              if (!existingMessages || existingMessages.length === 0) {
                // Only send message if we haven't sent one before
                await notificationService.sendEnhancedSystemMessage(
                  'reject',
                  'passenger',
                  SYSTEM_USER_ID,
                  confirmation.passenger_id,
                  ride,
                  trip,
                  'Request expired due to proximity to departure time'
                )
              }
            } catch (messageError: any) {
              console.error(`Error sending expiry message for ${confirmationId}:`, messageError)
              errors.push(`Error sending expiry message for ${confirmationId}: ${messageError.message}`)
            }
          }
        }
        
        return { processed, expired: stillPendingIds.length, errors }
      } catch (error: any) {
        errors.push(`Error processing expired confirmations: ${error.message}`)
        return { processed, expired: 0, errors }
      }
    }

    // Only log successful cleanup if there were expired confirmations
    if (expiredIds.length > 0) {
      console.log(`Background cleanup: successfully expired ${expiredIds.length} confirmations`)
    }

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