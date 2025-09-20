import { useState, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { notificationService } from '../utils/notificationService'
import { useErrorHandler } from './useErrorHandler'
import { RideConfirmation, CarRide, Trip } from '../types'

interface UseConfirmationFlowProps {
  onUpdate?: () => void
  onSuccess?: (message: string) => void
}

export function useConfirmationFlow({ onUpdate, onSuccess }: UseConfirmationFlowProps = {}) {
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [confirmationState, setConfirmationState] = useState<{
    showDisclaimer: boolean
    disclaimerType: string
    selectedConfirmation: RideConfirmation | null
  }>({
    showDisclaimer: false,
    disclaimerType: '',
    selectedConfirmation: null
  })

  const showDisclaimer = useCallback((type: string, confirmation?: RideConfirmation) => {
    setConfirmationState({
      showDisclaimer: true,
      disclaimerType: type,
      selectedConfirmation: confirmation || null
    })
  }, [])

  const hideDisclaimer = useCallback(() => {
    setConfirmationState({
      showDisclaimer: false,
      disclaimerType: '',
      selectedConfirmation: null
    })
  }, [])

  const acceptRequest = useCallback(async (confirmationId: string, userId: string, passengerId: string) => {
    return handleAsync(async () => {
      // Get confirmation details first for notifications
      const { data: confirmation, error: fetchError } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
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
          ),
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name
          )
        `)
        .eq('id', confirmationId)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'accepted',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      // Send comprehensive notification to passenger
      await notificationService.sendComprehensiveNotification(
        'accept',
        'passenger',
        userId,
        passengerId,
        confirmation.car_rides,
        confirmation.trips
      )

      // Send system chat message visible to both parties
      const passengerName = confirmation.user_profiles?.full_name || 'Passenger'
      const systemMessage = `Your ride request has been approved! You are confirmed for this ride.`

      await supabase
        .from('chat_messages')
        .insert({
          sender_id: userId,
          receiver_id: passengerId,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })
      )

      if (onUpdate) onUpdate()
      if (onSuccess) onSuccess('Request accepted successfully!')
      
      return true
    })
  }, [handleAsync, onUpdate, onSuccess])

  const rejectRequest = useCallback(async (confirmationId: string, userId: string, passengerId: string) => {
    return handleAsync(async () => {
      // Get confirmation details first for notifications
      const { data: confirmation, error: fetchError } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
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
          ),
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name
          )
        `)
        .eq('id', confirmationId)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      // Send comprehensive notification to passenger
      await notificationService.sendComprehensiveNotification(
        'reject',
        'passenger',
        userId,
        passengerId,
        confirmation.car_rides,
        confirmation.trips
      )

      // Send system chat message visible to both parties
      const passengerName = confirmation.user_profiles?.full_name || 'Passenger'
      const systemMessage = `Your ride request has been declined.`

      await supabase
        .from('chat_messages')
        .insert({
          sender_id: userId,
          receiver_id: passengerId,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })
      )

      if (onUpdate) onUpdate()
      if (onSuccess) onSuccess('Request rejected successfully!')
      
      return true
    })
  }, [handleAsync, onUpdate, onSuccess])

  const cancelConfirmation = useCallback(async (
    confirmationId: string, 
    userId: string, 
    isOwner: boolean,
    ride?: CarRide,
    trip?: Trip
  ) => {
    return handleAsync(async () => {
      // Get confirmation details first
      const { data: confirmation, error: fetchError } = await supabase
        .from('ride_confirmations')
        .select('*')
        .eq('id', confirmationId)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      // Send system message to the other party
      const receiverId = isOwner ? confirmation.passenger_id : confirmation.ride_owner_id
      const userRole = isOwner ? 'owner' : 'passenger'
      
      await notificationService.sendEnhancedSystemMessage(
        'cancel',
        userRole,
        userId,
        receiverId,
        ride,
        trip
      )

      if (onUpdate) onUpdate()
      if (onSuccess) onSuccess('Ride cancelled successfully!')
      
      return true
    })
  }, [handleAsync, onUpdate, onSuccess])

  const createConfirmation = useCallback(async (
    rideId: string | null,
    tripId: string | null,
    rideOwnerId: string,
    passengerId: string
  ) => {
    return handleAsync(async () => {
      const { error } = await supabase
        .from('ride_confirmations')
        .insert({
          ride_id: rideId,
          trip_id: tripId,
          ride_owner_id: rideOwnerId,
          passenger_id: passengerId,
          status: 'pending'
        })

      if (error) {
        // Handle duplicate request error
        if (error.code === '23505') {
          throw new Error('You have already requested to join this ride. Please wait for a response.')
        }
        throw error
      }

      // Send comprehensive notification to ride owner
      await notificationService.sendComprehensiveNotification(
        'request',
        'owner',
        passengerId,
        rideOwnerId
      )

      // Send system chat message visible to both parties
      const { data: passengerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', passengerId)
        .single()

      const passengerName = passengerProfile?.full_name || 'A passenger'
      const systemMessage = `Passenger ${passengerName} has requested a ride. Please approve.`

      await supabase
        .from('chat_messages')
        .insert({
          sender_id: passengerId,
          receiver_id: rideOwnerId,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      if (onUpdate) onUpdate()
      if (onSuccess) onSuccess('Confirmation request sent successfully!')
      
      return true
    })
  }, [handleAsync, onUpdate, onSuccess])

  return {
    error,
    isLoading,
    clearError,
    confirmationState,
    showDisclaimer,
    hideDisclaimer,
    acceptRequest,
    rejectRequest,
    cancelConfirmation,
    createConfirmation
  }
}