import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'
import { CarRide, Trip } from '../types'

/**
 * Close a trip and prevent new enquiries
 */
export const closeTrip = async (
  tripId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    // Verify ownership
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single()

    if (fetchError || !trip) {
      throw new Error('Trip not found')
    }

    if (trip.user_id !== userId) {
      throw new Error('You can only close your own trips')
    }

    // Close the trip
    const { error } = await supabase
      .from('trips')
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_reason: reason || null
      })
      .eq('id', tripId)

    if (error) {
      throw new Error(error.message)
    }

    // Reject all pending confirmations for this trip
    await supabase
      .from('ride_confirmations')
      .update({
        status: 'rejected',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('trip_id', tripId)
      .eq('status', 'pending')

    return { success: true }
  })
}

/**
 * Close a car ride and prevent new enquiries
 */
export const closeRide = async (
  rideId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    // Verify ownership
    const { data: ride, error: fetchError } = await supabase
      .from('car_rides')
      .select('user_id')
      .eq('id', rideId)
      .single()

    if (fetchError || !ride) {
      throw new Error('Ride not found')
    }

    if (ride.user_id !== userId) {
      throw new Error('You can only close your own rides')
    }

    // Close the ride
    const { error } = await supabase
      .from('car_rides')
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_reason: reason || null
      })
      .eq('id', rideId)

    if (error) {
      throw new Error(error.message)
    }

    // Reject all pending confirmations for this ride
    await supabase
      .from('ride_confirmations')
      .update({
        status: 'rejected',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('ride_id', rideId)
      .eq('status', 'pending')

    return { success: true }
  })
}

/**
 * Reopen a closed trip
 */
export const reopenTrip = async (
  tripId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    console.log('reopenTrip called with:', { tripId, userId })
    
    // Verify ownership and current status
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('user_id, travel_date, is_closed')
      .eq('id', tripId)
      .single()

    console.log('Trip fetch result:', { trip, fetchError })
    if (fetchError || !trip) {
      throw new Error('Trip not found')
    }

    if (trip.user_id !== userId) {
      throw new Error('You can only reopen your own trips')
    }

    if (!trip.is_closed) {
      throw new Error('Trip is already open')
    }

    // Check if trip is still in the future
    if (new Date(trip.travel_date) <= new Date()) {
      throw new Error('Cannot reopen past trips')
    }

    console.log('Updating trip to reopen...')
    // Reopen the trip
    const { error } = await supabase
      .from('trips')
      .update({
        is_closed: false,
        closed_at: null,
        closed_reason: null
      })
      .eq('id', tripId)
      .eq('user_id', userId) // Additional security check

    console.log('Update result:', { error })
    if (error) {
      throw new Error(error.message)
    }

    console.log(`Trip ${tripId} reopened successfully`)
    return { success: true }
  })
}

/**
 * Reopen a closed car ride
 */
export const reopenRide = async (
  rideId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  return retryWithBackoff(async () => {
    console.log('reopenRide called with:', { rideId, userId })
    
    // Verify ownership and current status
    const { data: ride, error: fetchError } = await supabase
      .from('car_rides')
      .select('user_id, departure_date_time, is_closed')
      .eq('id', rideId)
      .single()

    console.log('Ride fetch result:', { ride, fetchError })
    if (fetchError || !ride) {
      throw new Error('Ride not found')
    }

    if (ride.user_id !== userId) {
      throw new Error('You can only reopen your own rides')
    }

    if (!ride.is_closed) {
      throw new Error('Ride is already open')
    }

    // Check if ride is still in the future
    if (new Date(ride.departure_date_time) <= new Date()) {
      throw new Error('Cannot reopen past rides')
    }

    console.log('Updating ride to reopen...')
    // Reopen the ride
    const { error } = await supabase
      .from('car_rides')
      .update({
        is_closed: false,
        closed_at: null,
        closed_reason: null
      })
      .eq('id', rideId)
      .eq('user_id', userId) // Additional security check

    console.log('Update result:', { error })
    if (error) {
      throw new Error(error.message)
    }

    console.log(`Ride ${rideId} reopened successfully`)
    return { success: true }
  })
}

/**
 * Get closure history for trips and rides
 */
export const getClosureHistory = async (
  userId: string
): Promise<{
  closedTrips: Trip[]
  closedRides: CarRide[]
}> => {
  return retryWithBackoff(async () => {
    // Get closed trips
    const { data: closedTrips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .eq('is_closed', true)
      .order('closed_at', { ascending: false })

    if (tripsError) {
      throw new Error(tripsError.message)
    }

    // Get closed rides
    const { data: closedRides, error: ridesError } = await supabase
      .from('car_rides')
      .select('*')
      .eq('user_id', userId)
      .eq('is_closed', true)
      .order('closed_at', { ascending: false })

    if (ridesError) {
      throw new Error(ridesError.message)
    }

    return {
      closedTrips: closedTrips || [],
      closedRides: closedRides || []
    }
  })
}