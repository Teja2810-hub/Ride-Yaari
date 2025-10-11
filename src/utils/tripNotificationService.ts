import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'
import { Trip, TripRequest, TripNotification } from '../types'
import { getUserDisplayName } from './messageTemplates'

/**
 * Find matching travelers for a trip request and send notifications
 */
export const notifyMatchingTravelers = async (requestId: string): Promise<{
  success: boolean
  notifiedTravelers: number
  error?: string
}> => {
  return retryWithBackoff(async () => {
    console.log('Finding matching travelers for request:', requestId)
    
    // Get the trip request details
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

    console.log('Found trip request:', {
      id: request.id,
      passenger: request.user_profiles?.full_name,
      route: `${request.departure_airport} → ${request.destination_airport}`
    })

    // Find matching trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select(`
        *,
        user_profiles!trips_user_id_fkey (
          id,
          full_name
        )
      `)
      .eq('is_closed', false)
      .gte('travel_date', new Date().toISOString().split('T')[0]) // Only future trips
      .eq('leaving_airport', request.departure_airport)
      .eq('destination_airport', request.destination_airport)

    if (tripsError) {
      throw new Error(tripsError.message)
    }

    console.log('Found trips to check:', trips?.length || 0)

    const matchingTrips: Trip[] = []

    // Check each trip for date matching
    for (const trip of trips || []) {
      // Skip if it's the passenger's own trip
      if (trip.user_id === request.passenger_id) continue

      // Check date matching
      const tripDate = new Date(trip.travel_date)
      let dateMatches = false

      if (request.request_type === 'specific_date' && request.specific_date) {
        dateMatches = tripDate.toDateString() === new Date(request.specific_date).toDateString()
      } else if (request.request_type === 'multiple_dates' && request.multiple_dates) {
        dateMatches = request.multiple_dates.some(date => 
          tripDate.toDateString() === new Date(date).toDateString()
        )
      } else if (request.request_type === 'month' && request.request_month) {
        const tripMonth = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`
        dateMatches = tripMonth === request.request_month
      }

      if (dateMatches) {
        matchingTrips.push(trip)
      }
    }

    console.log('Found matching trips:', matchingTrips.length)

    // Send notifications to matching travelers
    let notifiedTravelers = 0
    for (const trip of matchingTrips) {
      try {
        await sendTripRequestNotification(
          trip.user_id,
          request,
          trip
        )
        notifiedTravelers++
      } catch (error) {
        console.error('Error notifying traveler:', trip.user_id, error)
      }
    }

    console.log('Notified travelers:', notifiedTravelers)

    return {
      success: true,
      notifiedTravelers
    }
  })
}

/**
 * Send notification to a traveler about a trip request
 */
export const sendTripRequestNotification = async (
  travelerId: string,
  request: TripRequest & { user_profiles?: { full_name: string } },
  trip: Trip
): Promise<void> => {
  try {
    const passengerName = request.user_profiles?.full_name || await getUserDisplayName(request.passenger_id)
    
    const dateInfo = request.request_type === 'specific_date' 
      ? `on ${new Date(request.specific_date!).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`
      : request.request_type === 'month'
        ? `in ${request.request_month}`
        : 'on multiple dates'

    const timeInfo = request.departure_time_preference 
      ? ` at ${request.departure_time_preference}`
      : ''

    const notificationMessage = `✈️ **Trip Assistance Request!**

👤 **Passenger:** ${passengerName}
📍 **Route:** ${request.departure_airport} → ${request.destination_airport}
📅 **When:** ${dateInfo}${timeInfo}

${request.additional_notes ? `📝 **Notes:** ${request.additional_notes}\n\n` : ''}**Your Matching Trip:**
✈️ ${trip.leaving_airport} → ${trip.destination_airport}
📅 ${new Date(trip.travel_date).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}${trip.departure_time ? ` at ${trip.departure_time}` : ''}
${trip.price ? `💰 ${trip.currency || 'USD'} ${trip.price}${trip.negotiable ? ' (negotiable)' : ''}` : '💰 Free assistance'}

💡 **Action:** Contact ${passengerName} if you can provide this assistance!`

    // Send system message to traveler
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: '00000000-0000-0000-0000-000000000000', // System user
        receiver_id: travelerId,
        message_content: notificationMessage,
        message_type: 'system',
        is_read: false
      })

    if (error) {
      throw error
    }

    console.log(`Trip request notification sent to traveler ${travelerId}`)
  } catch (error) {
    console.error('Error sending trip request notification:', error)
    throw error
  }
}

/**
 * Find matching trip requests when a new trip is posted and notify passengers
 */
export const notifyMatchingPassengers = async (tripId: string): Promise<{
  success: boolean
  notifiedPassengers: number
  error?: string
}> => {
  return retryWithBackoff(async () => {
    console.log('Finding matching passengers for trip:', tripId)
    
    // Get the trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        *,
        user_profiles!trips_user_id_fkey (
          full_name
        )
      `)
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      throw new Error('Trip not found')
    }

    console.log('Found trip:', {
      id: trip.id,
      traveler: trip.user_profiles?.full_name,
      route: `${trip.leaving_airport} → ${trip.destination_airport}`,
      travel_date: trip.travel_date
    })

    // Find matching trip requests
    const { data: tripRequests, error: requestsError } = await supabase
      .from('trip_requests')
      .select(`
        *,
        user_profiles!trip_requests_passenger_id_fkey (
          full_name
        )
      `)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .eq('departure_airport', trip.leaving_airport)
      .eq('destination_airport', trip.destination_airport)

    if (requestsError) {
      throw new Error(requestsError.message)
    }

    console.log('Found trip requests to check:', tripRequests?.length || 0)

    const matchingRequests: Array<TripRequest & { user_profiles?: { full_name: string } }> = []

    // Check each request for date matching
    for (const request of tripRequests || []) {
      // Skip if it's the traveler's own request
      if (request.passenger_id === trip.user_id) continue

      // Check date matching
      const tripDate = new Date(trip.travel_date)
      const tripDateOnly = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate())
      let dateMatches = false

      if (request.request_type === 'specific_date' && request.specific_date) {
        const requestDate = new Date(request.specific_date)
        const requestDateOnly = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate())
        dateMatches = tripDateOnly.getTime() === requestDateOnly.getTime()
      } else if (request.request_type === 'multiple_dates' && request.multiple_dates) {
        dateMatches = request.multiple_dates.some(date => {
          const reqDate = new Date(date)
          const reqDateOnly = new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate())
          return tripDateOnly.getTime() === reqDateOnly.getTime()
        })
      } else if (request.request_type === 'month' && request.request_month) {
        const tripMonth = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`
        dateMatches = tripMonth === request.request_month
      }

      if (dateMatches) {
        matchingRequests.push(request)
      }
    }

    console.log('Found matching requests:', matchingRequests.length)

    // Send notifications to matching passengers
    let notifiedPassengers = 0
    for (const request of matchingRequests) {
      try {
        await sendMatchingTripNotification(
          request.passenger_id,
          trip,
          request
        )
        notifiedPassengers++
      } catch (error) {
        console.error('Error notifying passenger:', request.passenger_id, error)
      }
    }

    console.log('Notified passengers:', notifiedPassengers)

    return {
      success: true,
      notifiedPassengers
    }
  })
}

/**
 * Send notification to passenger about a matching trip
 */
export const sendMatchingTripNotification = async (
  passengerId: string,
  trip: Trip & { user_profiles?: { full_name: string } },
  request: TripRequest
): Promise<void> => {
  try {
    const travelerName = trip.user_profiles?.full_name || await getUserDisplayName(trip.user_id)
    const tripDate = new Date(trip.travel_date)

    const notificationMessage = `🎉 **Matching Trip Found!**

✈️ **Traveler:** ${travelerName}
📍 **Route:** ${trip.leaving_airport} → ${trip.destination_airport}
📅 **Date:** ${tripDate.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}
${trip.departure_time ? `⏰ **Departure:** ${trip.departure_time}${trip.departure_timezone ? ` (${trip.departure_timezone})` : ''}` : ''}
${trip.landing_time ? `🛬 **Landing:** ${trip.landing_time}${trip.landing_timezone ? ` (${trip.landing_timezone})` : ''}` : ''}
${trip.price ? `💰 **Service Fee:** ${trip.currency || 'USD'} ${trip.price}${trip.negotiable ? ' (negotiable)' : ''}` : '💰 **Free assistance**'}

**Your Request:**
📍 ${request.departure_airport} → ${request.destination_airport}
${request.additional_notes ? `📝 Notes: ${request.additional_notes}` : ''}

💡 **Action:** Contact ${travelerName} to request assistance on this trip!`

    // Send system message to passenger
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: '00000000-0000-0000-0000-000000000000', // System user
        receiver_id: passengerId,
        message_content: notificationMessage,
        message_type: 'system',
        is_read: false
      })

    if (error) {
      throw error
    }

    console.log(`Matching trip notification sent to passenger ${passengerId}`)
  } catch (error) {
    console.error('Error sending matching trip notification:', error)
    throw error
  }
}

/**
 * Process traveler notification preferences when a passenger requests a trip
 * ALSO checks for post notification preferences (users who posted trips with future notifications)
 */
export const processTravelerNotifications = async (requestId: string): Promise<{
  success: boolean
  notifiedTravelers: number
  error?: string
}> => {
  return retryWithBackoff(async () => {
    console.log('Processing traveler notifications for request:', requestId)

    // Get the trip request details
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

    let notifiedTravelers = 0

    // PART 1: Find matching traveler notification preferences (passenger_request type)
    const { data: travelerNotifications, error: notificationsError } = await supabase
      .from('trip_notifications')
      .select(`
        *,
        user_profiles!trip_notifications_user_id_fkey (
          full_name
        )
      `)
      .eq('notification_type', 'passenger_request')
      .eq('is_active', true)
      .eq('departure_airport', request.departure_airport)
      .eq('destination_airport', request.destination_airport)
      .neq('user_id', request.passenger_id)

    if (!notificationsError) {
      console.log('Found traveler passenger_request notifications to check:', travelerNotifications?.length || 0)

      const matchingNotifications: Array<TripNotification & { user_profiles?: { full_name: string } }> = []

      // Check each notification for date matching
      for (const notification of travelerNotifications || []) {
        // Skip if it's the passenger's own notification
        if (notification.user_id === request.passenger_id) continue

        // Check date matching with normalized dates
        let dateMatches = false

        if (notification.date_type === 'specific_date' && notification.specific_date) {
          if (request.request_type === 'specific_date' && request.specific_date) {
            const notifDate = new Date(notification.specific_date)
            const notifDateOnly = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate())
            const reqDate = new Date(request.specific_date)
            const reqDateOnly = new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate())
            dateMatches = notifDateOnly.getTime() === reqDateOnly.getTime()
          }
        } else if (notification.date_type === 'multiple_dates' && notification.multiple_dates) {
          if (request.request_type === 'specific_date' && request.specific_date) {
            const reqDate = new Date(request.specific_date)
            const reqDateOnly = new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate())
            dateMatches = notification.multiple_dates.some(date => {
              const notifDate = new Date(date)
              const notifDateOnly = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate())
              return notifDateOnly.getTime() === reqDateOnly.getTime()
            })
          } else if (request.request_type === 'multiple_dates' && request.multiple_dates) {
            dateMatches = notification.multiple_dates.some(notifDate => {
              const nDate = new Date(notifDate)
              const nDateOnly = new Date(nDate.getFullYear(), nDate.getMonth(), nDate.getDate())
              return request.multiple_dates!.some(reqDate => {
                const rDate = new Date(reqDate)
                const rDateOnly = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate())
                return nDateOnly.getTime() === rDateOnly.getTime()
              })
            })
          }
        } else if (notification.date_type === 'month' && notification.notification_month) {
          if (request.request_type === 'month' && request.request_month) {
            dateMatches = notification.notification_month === request.request_month
          } else if (request.request_type === 'specific_date' && request.specific_date) {
            const requestMonth = `${new Date(request.specific_date).getFullYear()}-${String(new Date(request.specific_date).getMonth() + 1).padStart(2, '0')}`
            dateMatches = notification.notification_month === requestMonth
          }
        }

        if (dateMatches) {
          matchingNotifications.push(notification)
        }
      }

      console.log('Found matching traveler passenger_request notifications:', matchingNotifications.length)

      // Send notifications to matching travelers
      for (const notification of matchingNotifications) {
        try {
          await sendTravelerNotificationAlert(
            notification.user_id,
            request
          )
          notifiedTravelers++
        } catch (error) {
          console.error('Error notifying traveler via notification preference:', notification.user_id, error)
        }
      }
    }

    // PART 2: Find matching post notification preferences (traveler_post type)
    const { data: postNotifications, error: postNotificationsError } = await supabase
      .from('trip_notifications')
      .select(`
        *,
        user_profiles!trip_notifications_user_id_fkey (
          full_name
        )
      `)
      .eq('notification_type', 'traveler_post')
      .eq('is_active', true)
      .eq('departure_airport', request.departure_airport)
      .eq('destination_airport', request.destination_airport)
      .neq('user_id', request.passenger_id)

    if (!postNotificationsError) {
      console.log('Found traveler_post notifications to check:', postNotifications?.length || 0)

      const matchingPostNotifications: Array<TripNotification & { user_profiles?: { full_name: string } }> = []

      // Check each post notification for date matching
      for (const notification of postNotifications || []) {
        // Check date matching with normalized dates
        let dateMatches = false

        if (notification.date_type === 'specific_date' && notification.specific_date) {
          if (request.request_type === 'specific_date' && request.specific_date) {
            const notifDate = new Date(notification.specific_date)
            const notifDateOnly = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate())
            const reqDate = new Date(request.specific_date)
            const reqDateOnly = new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate())
            dateMatches = notifDateOnly.getTime() === reqDateOnly.getTime()
          }
        } else if (notification.date_type === 'multiple_dates' && notification.multiple_dates) {
          if (request.request_type === 'specific_date' && request.specific_date) {
            const reqDate = new Date(request.specific_date)
            const reqDateOnly = new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate())
            dateMatches = notification.multiple_dates.some(date => {
              const notifDate = new Date(date)
              const notifDateOnly = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate())
              return notifDateOnly.getTime() === reqDateOnly.getTime()
            })
          } else if (request.request_type === 'multiple_dates' && request.multiple_dates) {
            dateMatches = notification.multiple_dates.some(notifDate => {
              const nDate = new Date(notifDate)
              const nDateOnly = new Date(nDate.getFullYear(), nDate.getMonth(), nDate.getDate())
              return request.multiple_dates!.some(reqDate => {
                const rDate = new Date(reqDate)
                const rDateOnly = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate())
                return nDateOnly.getTime() === rDateOnly.getTime()
              })
            })
          }
        } else if (notification.date_type === 'month' && notification.notification_month) {
          if (request.request_type === 'month' && request.request_month) {
            dateMatches = notification.notification_month === request.request_month
          } else if (request.request_type === 'specific_date' && request.specific_date) {
            const requestMonth = `${new Date(request.specific_date).getFullYear()}-${String(new Date(request.specific_date).getMonth() + 1).padStart(2, '0')}`
            dateMatches = notification.notification_month === requestMonth
          }
        }

        if (dateMatches) {
          matchingPostNotifications.push(notification)
        }
      }

      console.log('Found matching traveler_post notifications:', matchingPostNotifications.length)

      // Send notifications to matching travelers with post notifications
      for (const notification of matchingPostNotifications) {
        try {
          await sendTravelerNotificationAlert(
            notification.user_id,
            request
          )
          notifiedTravelers++
        } catch (error) {
          console.error('Error notifying traveler via post notification preference:', notification.user_id, error)
        }
      }
    }

    console.log('Total notified travelers via notifications:', notifiedTravelers)

    return {
      success: true,
      notifiedTravelers
    }
  })
}

/**
 * Send notification to traveler based on their notification preferences
 */
export const sendTravelerNotificationAlert = async (
  travelerId: string,
  request: TripRequest & { user_profiles?: { full_name: string } }
): Promise<void> => {
  try {
    const passengerName = request.user_profiles?.full_name || await getUserDisplayName(request.passenger_id)
    
    const dateInfo = request.request_type === 'specific_date' 
      ? `on ${new Date(request.specific_date!).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`
      : request.request_type === 'month'
        ? `in ${request.request_month}`
        : 'on multiple dates'

    const timeInfo = request.departure_time_preference 
      ? ` at ${request.departure_time_preference}`
      : ''

    const notificationMessage = `🔔 **Trip Request Alert!**

You have a notification set up for this route and a passenger is looking for assistance!

👤 **Passenger:** ${passengerName}
📍 **Route:** ${request.departure_airport} → ${request.destination_airport}
📅 **When:** ${dateInfo}${timeInfo}

${request.additional_notes ? `📝 **Notes:** ${request.additional_notes}\n\n` : ''}💡 **Action:** If you can provide this assistance, post a matching trip or contact ${passengerName} directly!

📱 **Manage Notifications:** You can manage your trip notification preferences in your Profile → Notifications tab.`

    // Send system message to traveler
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: '00000000-0000-0000-0000-000000000000', // System user
        receiver_id: travelerId,
        message_content: notificationMessage,
        message_type: 'system',
        is_read: false
      })

    if (error) {
      throw error
    }

    console.log(`Traveler notification alert sent to ${travelerId}`)
  } catch (error) {
    console.error('Error sending traveler notification alert:', error)
    throw error
  }
}

/**
 * Auto-expire old trip requests and notifications
 */
export const cleanupExpiredTripNotifications = async (): Promise<{
  expiredRequests: number
  expiredNotifications: number
  errors: string[]
}> => {
  return retryWithBackoff(async () => {
    const errors: string[] = []
    let expiredRequests = 0
    let expiredNotifications = 0

    try {
      // Clean up expired trip requests
      const { data: expiredRequestsData, error: requestsError } = await supabase
        .from('trip_requests')
        .update({ is_active: false })
        .eq('is_active', true)
        .lte('expires_at', new Date().toISOString())
        .select()

      if (requestsError) {
        errors.push(`Error cleaning up expired requests: ${requestsError.message}`)
      } else {
        expiredRequests = expiredRequestsData?.length || 0
      }
    } catch (error: any) {
      errors.push(`Error processing expired requests: ${error.message}`)
    }

    try {
      // Clean up expired notifications
      const { data: expiredNotificationsData, error: notificationsError } = await supabase
        .from('trip_notifications')
        .update({ is_active: false })
        .eq('is_active', true)
        .lte('expires_at', new Date().toISOString())
        .select()

      if (notificationsError) {
        errors.push(`Error cleaning up expired notifications: ${notificationsError.message}`)
      } else {
        expiredNotifications = expiredNotificationsData?.length || 0
      }
    } catch (error: any) {
      errors.push(`Error processing expired notifications: ${error.message}`)
    }

    console.log('Trip cleanup completed:', { expiredRequests, expiredNotifications, errors })

    return {
      expiredRequests,
      expiredNotifications,
      errors
    }
  })
}