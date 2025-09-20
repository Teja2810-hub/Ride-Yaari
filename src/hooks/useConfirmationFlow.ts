import { useState, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { notificationService } from '../utils/notificationService'
import { CarRide, Trip } from '../types'
import { useErrorHandler } from './useErrorHandler'

interface ConfirmationState {
  showDisclaimer: boolean
  disclaimerType: string | null
  selectedConfirmation: any
}

interface UseConfirmationFlowProps {
  onUpdate?: () => void
  onSuccess?: (message: string) => void
  onError?: (error: string) => void
}

export function useConfirmationFlow({ 
  onUpdate, 
  onSuccess, 
  onError 
}: UseConfirmationFlowProps = {}) {
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({
    showDisclaimer: false,
    disclaimerType: null,
    selectedConfirmation: null
  })

  const showDisclaimer = useCallback((type: string, confirmation?: any) => {
    setConfirmationState({
      showDisclaimer: true,
      disclaimerType: type,
      selectedConfirmation: confirmation
    })
  }, [])

  const hideDisclaimer = useCallback(() => {
    setConfirmationState({
      showDisclaimer: false,
      disclaimerType: null,
      selectedConfirmation: null
    })
  }, [])

  const createConfirmation = useCallback(async (
    rideId: string | null,
    tripId: string | null,
    rideOwnerId: string,
    passengerId: string
  ) => {
    return handleAsync(async () => {
      // Insert the ride confirmation
      const { data, error } = await supabase
        .from('ride_confirmations')
        .insert({
          ride_id: rideId,
          trip_id: tripId,
          ride_owner_id: rideOwnerId,
          passenger_id: passengerId,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      // Get passenger name for notifications
      const { data: passengerProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', passengerId)
        .single()

      const passengerName = passengerProfile?.full_name || 'Unknown'

      // Get ride/trip data for notifications
      let ride: CarRide | undefined
      let trip: Trip | undefined

      if (rideId) {
        const { data: rideData } = await supabase
          .from('car_rides')
          .select('*')
          .eq('id', rideId)
          .single()
        ride = rideData || undefined
      }

      if (tripId) {
        const { data: tripData } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single()
        trip = tripData || undefined
      }

      // Send comprehensive notification to ride owner
      await notificationService.sendComprehensiveNotification(
        'request',
        'owner',
        passengerId,
        rideOwnerId,
        ride,
        trip,
        `New request from ${passengerName}`
      )

      // Send system chat message visible to both parties
      const rideDetails = ride 
        ? `car ride from ${ride.from_location} to ${ride.to_location}`
        : trip 
          ? `airport trip from ${trip.leaving_airport} to ${trip.destination_airport}`
          : 'ride'

      await supabase
        .from('chat_messages')
        .insert({
          sender_id: passengerId,
          receiver_id: rideOwnerId,
          message_content: `${passengerName} has requested to join your ${rideDetails}. Please review and respond.`,
          message_type: 'system',
          is_read: false
        })

      if (onUpdate) onUpdate()
      if (onSuccess) onSuccess('Ride confirmation request sent successfully!')

      return data
    })
  }, [handleAsync, onUpdate, onSuccess])

  const acceptRequest = useCallback(async (
    confirmationId: string,
    ownerId: string,
    passengerId: string
  ) => {
    return handleAsync(async () => {
      // Update confirmation status to accepted
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'accepted',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      // Get confirmation details for notifications
      const { data: confirmation } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_passenger_id_fkey (
            full_name
          ),
          car_rides!ride_confirmations_ride_id_fkey (*),
          trips!ride_confirmations_trip_id_fkey (*)
        `)
        .eq('id', confirmationId)
        .single()

      if (confirmation) {
        const passengerName = confirmation.user_profiles?.full_name || 'Unknown'
        const ride = confirmation.car_rides
        const trip = confirmation.trips

        // Send comprehensive notification to passenger
        await notificationService.sendComprehensiveNotification(
          'accept',
          'passenger',
          ownerId,
          passengerId,
          ride,
          trip,
          `Request accepted by ride owner`
        )

        // Send system chat message visible to both parties
        const rideDetails = ride 
          ? `car ride from ${ride.from_location} to ${ride.to_location}`
          : trip 
            ? `airport trip from ${trip.leaving_airport} to ${trip.destination_airport}`
            : 'ride'

        await supabase
          .from('chat_messages')
          .insert({
            sender_id: ownerId,
            receiver_id: passengerId,
            message_content: `🎉 Great news! Your request for the ${rideDetails} has been ACCEPTED! You can now coordinate pickup details and payment.`,
            message_type: 'system',
            is_read: false
          })
      }

      if (onUpdate) onUpdate()
      if (onSuccess) onSuccess('Request accepted successfully!')
    })
  }, [handleAsync, onUpdate, onSuccess])

  const rejectRequest = useCallback(async (
    confirmationId: string,
    ownerId: string,
    passengerId: string
  ) => {
    return handleAsync(async () => {
      // Update confirmation status to rejected
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      // Get confirmation details for notifications
      const { data: confirmation } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_passenger_id_fkey (
            full_name
          ),
          car_rides!ride_confirmations_ride_id_fkey (*),
          trips!ride_confirmations_trip_id_fkey (*)
        `)
        .eq('id', confirmationId)
        .single()

      if (confirmation) {
        const passengerName = confirmation.user_profiles?.full_name || 'Unknown'
        const ride = confirmation.car_rides
        const trip = confirmation.trips

        // Send comprehensive notification to passenger
        await notificationService.sendComprehensiveNotification(
          'reject',
          'passenger',
          ownerId,
          passengerId,
          ride,
          trip,
          `Request rejected by ride owner`
        )

        // Send system chat message visible to both parties
        const rideDetails = ride 
          ? `car ride from ${ride.from_location} to ${ride.to_location}`
          : trip 
            ? `airport trip from ${trip.leaving_airport} to ${trip.destination_airport}`
            : 'ride'

        await supabase
          .from('chat_messages')
          .insert({
            sender_id: ownerId,
            receiver_id: passengerId,
            message_content: `😔 Your request for the ${rideDetails} has been declined. You can request to join this ride again or find other options.`,
            message_type: 'system',
            is_read: false
          })
      }

      if (onUpdate) onUpdate()
      if (onSuccess) onSuccess('Request rejected successfully!')
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
      // Update confirmation status to rejected (representing cancellation)
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationId)

      if (error) throw error

      // Get confirmation details for notifications
      const { data: confirmation } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_passenger_id_fkey (
            full_name
          )
        `)
        .eq('id', confirmationId)
        .single()

      if (confirmation) {
        const otherUserId = isOwner ? confirmation.passenger_id : confirmation.ride_owner_id
        const cancellingUserName = isOwner ? 'Driver' : confirmation.user_profiles?.full_name || 'Passenger'

        // Send comprehensive notification to the other party
        await notificationService.sendComprehensiveNotification(
          'cancel',
          isOwner ? 'passenger' : 'owner',
          userId,
          otherUserId,
          ride,
          trip,
          `Ride cancelled by ${cancellingUserName}`
        )

        // Send system chat message visible to both parties
        const rideDetails = ride 
          ? `car ride from ${ride.from_location} to ${ride.to_location}`
          : trip 
            ? `airport trip from ${trip.leaving_airport} to ${trip.destination_airport}`
            : 'ride'

        await supabase
          .from('chat_messages')
          .insert({
            sender_id: userId,
            receiver_id: otherUserId,
            message_content: `🚫 The ${rideDetails} has been cancelled by ${cancellingUserName}. The ride is now available for new requests.`,
            message_type: 'system',
            is_read: false
          })
      }

      if (onUpdate) onUpdate()
      if (onSuccess) onSuccess('Ride cancelled successfully!')
    })
  }, [handleAsync, onUpdate, onSuccess])

  return {
    error,
    isLoading,
    confirmationState,
    showDisclaimer,
    hideDisclaimer,
    createConfirmation,
    acceptRequest,
    rejectRequest,
    cancelConfirmation,
    clearError
  }
}