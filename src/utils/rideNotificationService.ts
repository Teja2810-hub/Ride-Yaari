import { supabase } from './supabase'
import { retryWithBackoff } from './errorUtils'
import { haversineDistance } from './distance'
import { CarRide, RideRequest, RideNotification } from '../types'
import { getUserDisplayName } from './messageTemplates'

/**
 * Find matching drivers for a ride request and send notifications
 */
export const notifyMatchingDrivers = async (requestId: string): Promise<{
  success: boolean
  notifiedDrivers: number
  error?: string
}> => {
  return retryWithBackoff(async () => {
    console.log('Finding matching drivers for request:', requestId)
    
    // Get the ride request details
    const { data: request, error: requestError } = await supabase
      .from('ride_requests')
      .select(`
        *,
        user_profiles!ride_requests_passenger_id_fkey (
          full_name
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      throw new Error('Ride request not found')
    }

    console.log('Found ride request:', {
      id: request.id,
      passenger: request.user_profiles?.full_name,
      route: `${request.departure_location} → ${request.destination_location}`,
      radius: request.search_radius_miles
    })

    // Find matching car rides within the search radius
    const { data: carRides, error: ridesError } = await supabase
      .from('car_rides')
      .select(`
        *,
        user_profiles!car_rides_user_id_fkey (
          id,
          full_name
        )
      `)
      .eq('is_closed', false)
      .gte('departure_date_time', new Date().toISOString()) // Only future rides
      .not('from_latitude', 'is', null)
      .not('from_longitude', 'is', null)
      .not('to_latitude', 'is', null)
      .not('to_longitude', 'is', null)

    if (ridesError) {
      throw new Error(ridesError.message)
    }

    console.log('Found car rides to check:', carRides?.length || 0)

    const matchingRides: Array<{
      ride: CarRide
      departureDistance: number
      destinationDistance: number
    }> = []

    // Check each ride for proximity and date matching
    for (const ride of carRides || []) {
      // Skip if it's the passenger's own ride
      if (ride.user_id === request.passenger_id) continue

      // Calculate distances
      const departureDistance = haversineDistance(
        request.departure_latitude || 0,
        request.departure_longitude || 0,
        ride.from_latitude || 0,
        ride.from_longitude || 0
      )

      const destinationDistance = haversineDistance(
        request.destination_latitude || 0,
        request.destination_longitude || 0,
        ride.to_latitude || 0,
        ride.to_longitude || 0
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
          matchingRides.push({
            ride,
            departureDistance,
            destinationDistance
          })
        }
      }
    }

    console.log('Found matching rides:', matchingRides.length)

    // Send notifications to matching drivers
    let notifiedDrivers = 0
    for (const match of matchingRides) {
      try {
        await sendRideRequestNotification(
          match.ride.user_id,
          request,
          match.ride,
          match.departureDistance,
          match.destinationDistance
        )
        notifiedDrivers++
      } catch (error) {
        console.error('Error notifying driver:', match.ride.user_id, error)
      }
    }

    console.log('Notified drivers:', notifiedDrivers)

    return {
      success: true,
      notifiedDrivers
    }
  })
}

/**
 * Send notification to a driver about a ride request
 */
export const sendRideRequestNotification = async (
  driverId: string,
  request: RideRequest & { user_profiles?: { full_name: string } },
  ride: CarRide,
  departureDistance: number,
  destinationDistance: number
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

    const notificationMessage = `🚗 **Ride Request Nearby!**

👤 **Passenger:** ${passengerName}
📍 **Route:** ${request.departure_location} → ${request.destination_location}
📅 **When:** ${dateInfo}${timeInfo}
📏 **Distance:** ~${Math.round(departureDistance)}mi from your departure, ~${Math.round(destinationDistance)}mi from your destination
🔍 **Search Radius:** ${request.search_radius_miles} miles

${request.additional_notes ? `📝 **Notes:** ${request.additional_notes}\n\n` : ''}**Your Matching Ride:**
🚗 ${ride.from_location} → ${ride.to_location}
📅 ${new Date(ride.departure_date_time).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})} at ${new Date(ride.departure_date_time).toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
})}
💰 ${ride.currency || 'USD'} ${ride.price}${ride.negotiable ? ' (negotiable)' : ''}

[user_id:${request.passenger_id}]`

    // Send system message to driver
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: '00000000-0000-0000-0000-000000000000', // System user
        receiver_id: driverId,
        message_content: notificationMessage,
        message_type: 'system',
        is_read: false
      })

    if (error) {
      throw error
    }

    console.log(`Ride request notification sent to driver ${driverId}`)
  } catch (error) {
    console.error('Error sending ride request notification:', error)
    throw error
  }
}

/**
 * Find matching ride requests when a new ride is posted and notify passengers
 */
export const notifyMatchingPassengers = async (rideId: string): Promise<{
  success: boolean
  notifiedPassengers: number
  error?: string
}> => {
  return retryWithBackoff(async () => {
    console.log('Finding matching passengers for ride:', rideId)
    
    // Get the ride details
    const { data: ride, error: rideError } = await supabase
      .from('car_rides')
      .select(`
        *,
        user_profiles!car_rides_user_id_fkey (
          full_name
        )
      `)
      .eq('id', rideId)
      .single()

    if (rideError || !ride) {
      throw new Error('Ride not found')
    }

    console.log('Found ride:', {
      id: ride.id,
      driver: ride.user_profiles?.full_name,
      route: `${ride.from_location} → ${ride.to_location}`,
      departure: ride.departure_date_time
    })

    // Find matching ride requests
    const { data: rideRequests, error: requestsError } = await supabase
      .from('ride_requests')
      .select(`
        *,
        user_profiles!ride_requests_passenger_id_fkey (
          full_name
        )
      `)
      .eq('is_active', true)
      .not('departure_latitude', 'is', null)
      .not('departure_longitude', 'is', null)
      .not('destination_latitude', 'is', null)
      .not('destination_longitude', 'is', null)

    if (requestsError) {
      throw new Error(requestsError.message)
    }

    console.log('Found ride requests to check:', rideRequests?.length || 0)

    const matchingRequests: Array<{
      request: RideRequest & { user_profiles?: { full_name: string } }
      departureDistance: number
      destinationDistance: number
    }> = []

    // Check each request for proximity and date matching
    for (const request of rideRequests || []) {
      // Skip if it's the driver's own request
      if (request.passenger_id === ride.user_id) continue

      // Calculate distances
      const departureDistance = haversineDistance(
        ride.from_latitude || 0,
        ride.from_longitude || 0,
        request.departure_latitude || 0,
        request.departure_longitude || 0
      )

      const destinationDistance = haversineDistance(
        ride.to_latitude || 0,
        ride.to_longitude || 0,
        request.destination_latitude || 0,
        request.destination_longitude || 0
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
          matchingRequests.push({
            request,
            departureDistance,
            destinationDistance
          })
        }
      }
    }

    console.log('Found matching requests:', matchingRequests.length)

    // Send notifications to matching passengers
    let notifiedPassengers = 0
    for (const match of matchingRequests) {
      try {
        await sendMatchingRideNotification(
          match.request.passenger_id,
          ride,
          match.request,
          match.departureDistance,
          match.destinationDistance
        )
        notifiedPassengers++
      } catch (error) {
        console.error('Error notifying passenger:', match.request.passenger_id, error)
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
 * Send notification to passenger about a matching ride
 */
export const sendMatchingRideNotification = async (
  passengerId: string,
  ride: CarRide & { user_profiles?: { full_name: string } },
  request: RideRequest,
  departureDistance: number,
  destinationDistance: number
): Promise<void> => {
  try {
    const driverName = ride.user_profiles?.full_name || await getUserDisplayName(ride.user_id)
    const rideDate = new Date(ride.departure_date_time)

    const notificationMessage = `🎉 **Matching Ride Found!**

🚗 **Driver:** ${driverName}
📍 **Route:** ${ride.from_location} → ${ride.to_location}
📅 **Date:** ${rideDate.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}
⏰ **Time:** ${rideDate.toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
})}
💰 **Price:** ${ride.currency || 'USD'} ${ride.price}${ride.negotiable ? ' (negotiable)' : ''}
📏 **Distance:** ~${Math.round(departureDistance)}mi from your departure, ~${Math.round(destinationDistance)}mi from your destination

**Your Request:**
📍 ${request.departure_location} → ${request.destination_location}
🔍 Search radius: ${request.search_radius_miles} miles

[user_id:${ride.user_id}]`

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

    console.log(`Matching ride notification sent to passenger ${passengerId}`)
  } catch (error) {
    console.error('Error sending matching ride notification:', error)
    throw error
  }
}

/**
 * Process driver notification preferences when a passenger requests a ride
 * ALSO checks for post notification preferences (users who posted rides with future notifications)
 */
export const processDriverNotifications = async (requestId: string): Promise<{
  success: boolean
  notifiedDrivers: number
  error?: string
}> => {
  return retryWithBackoff(async () => {
    console.log('Processing driver notifications for request:', requestId)

    // Get the ride request details
    const { data: request, error: requestError } = await supabase
      .from('ride_requests')
      .select(`
        *,
        user_profiles!ride_requests_passenger_id_fkey (
          full_name
        )
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !request) {
      throw new Error('Ride request not found')
    }

    let notifiedDrivers = 0

    // PART 1: Find matching passenger_request notification preferences
    const { data: driverNotifications, error: notificationsError } = await supabase
      .from('ride_notifications')
      .select(`
        *,
        user_profiles!ride_notifications_user_id_fkey (
          full_name
        )
      `)
      .eq('notification_type', 'passenger_request')
      .eq('is_active', true)
      .not('departure_latitude', 'is', null)
      .not('departure_longitude', 'is', null)
      .not('destination_latitude', 'is', null)
      .not('destination_longitude', 'is', null)

    if (!notificationsError) {
      console.log('Found driver passenger_request notifications to check:', driverNotifications?.length || 0)

      const matchingNotifications: Array<{
        notification: RideNotification & { user_profiles?: { full_name: string } }
        departureDistance: number
        destinationDistance: number
      }> = []

      // Check each notification for proximity and date matching
      for (const notification of driverNotifications || []) {
        // Skip if it's the passenger's own notification
        if (notification.user_id === request.passenger_id) continue

        // Calculate distances
        const departureDistance = haversineDistance(
          request.departure_latitude || 0,
          request.departure_longitude || 0,
          notification.departure_latitude || 0,
          notification.departure_longitude || 0
        )

        const destinationDistance = haversineDistance(
          request.destination_latitude || 0,
          request.destination_longitude || 0,
          notification.destination_latitude || 0,
          notification.destination_longitude || 0
        )

        // Check if within search radius
        if (departureDistance <= notification.search_radius_miles &&
            destinationDistance <= notification.search_radius_miles) {

          // Check date matching
          let dateMatches = false

          if (notification.date_type === 'specific_date' && notification.specific_date) {
            if (request.request_type === 'specific_date' && request.specific_date) {
              dateMatches = new Date(notification.specific_date).toDateString() === new Date(request.specific_date).toDateString()
            }
          } else if (notification.date_type === 'multiple_dates' && notification.multiple_dates) {
            if (request.request_type === 'specific_date' && request.specific_date) {
              dateMatches = notification.multiple_dates.some(date =>
                new Date(date).toDateString() === new Date(request.specific_date!).toDateString()
              )
            } else if (request.request_type === 'multiple_dates' && request.multiple_dates) {
              dateMatches = notification.multiple_dates.some(notifDate =>
                request.multiple_dates!.some(reqDate =>
                  new Date(notifDate).toDateString() === new Date(reqDate).toDateString()
                )
              )
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
            matchingNotifications.push({
              notification,
              departureDistance,
              destinationDistance
            })
          }
        }
      }

      console.log('Found matching driver passenger_request notifications:', matchingNotifications.length)

      // Send notifications to matching drivers
      for (const match of matchingNotifications) {
        try {
          await sendDriverNotificationAlert(
            match.notification.user_id,
            request,
            match.departureDistance,
            match.destinationDistance
          )
          notifiedDrivers++
        } catch (error) {
          console.error('Error notifying driver via notification preference:', match.notification.user_id, error)
        }
      }
    }

    // PART 2: Find matching post notification preferences (driver_post type)
    const { data: postNotifications, error: postNotificationsError } = await supabase
      .from('ride_notifications')
      .select(`
        *,
        user_profiles!ride_notifications_user_id_fkey (
          full_name
        )
      `)
      .eq('notification_type', 'driver_post')
      .eq('is_active', true)
      .not('departure_latitude', 'is', null)
      .not('departure_longitude', 'is', null)
      .not('destination_latitude', 'is', null)
      .not('destination_longitude', 'is', null)

    if (!postNotificationsError) {
      console.log('Found driver_post notifications to check:', postNotifications?.length || 0)

      const matchingPostNotifications: Array<{
        notification: RideNotification & { user_profiles?: { full_name: string } }
        departureDistance: number
        destinationDistance: number
      }> = []

      // Check each post notification for proximity and date matching
      for (const notification of postNotifications || []) {
        // Skip if it's the passenger's own notification
        if (notification.user_id === request.passenger_id) continue

        // Calculate distances
        const departureDistance = haversineDistance(
          request.departure_latitude || 0,
          request.departure_longitude || 0,
          notification.departure_latitude || 0,
          notification.departure_longitude || 0
        )

        const destinationDistance = haversineDistance(
          request.destination_latitude || 0,
          request.destination_longitude || 0,
          notification.destination_latitude || 0,
          notification.destination_longitude || 0
        )

        // Check if within search radius
        if (departureDistance <= notification.search_radius_miles &&
            destinationDistance <= notification.search_radius_miles) {

          // Check date matching
          let dateMatches = false

          if (notification.date_type === 'specific_date' && notification.specific_date) {
            if (request.request_type === 'specific_date' && request.specific_date) {
              dateMatches = new Date(notification.specific_date).toDateString() === new Date(request.specific_date).toDateString()
            }
          } else if (notification.date_type === 'multiple_dates' && notification.multiple_dates) {
            if (request.request_type === 'specific_date' && request.specific_date) {
              dateMatches = notification.multiple_dates.some(date =>
                new Date(date).toDateString() === new Date(request.specific_date!).toDateString()
              )
            } else if (request.request_type === 'multiple_dates' && request.multiple_dates) {
              dateMatches = notification.multiple_dates.some(notifDate =>
                request.multiple_dates!.some(reqDate =>
                  new Date(notifDate).toDateString() === new Date(reqDate).toDateString()
                )
              )
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
            matchingPostNotifications.push({
              notification,
              departureDistance,
              destinationDistance
            })
          }
        }
      }

      console.log('Found matching driver_post notifications:', matchingPostNotifications.length)

      // Send notifications to matching drivers with post notifications
      for (const match of matchingPostNotifications) {
        try {
          await sendDriverNotificationAlert(
            match.notification.user_id,
            request,
            match.departureDistance,
            match.destinationDistance
          )
          notifiedDrivers++
        } catch (error) {
          console.error('Error notifying driver via post notification preference:', match.notification.user_id, error)
        }
      }
    }

    console.log('Total notified drivers via notifications:', notifiedDrivers)

    return {
      success: true,
      notifiedDrivers
    }
  })
}

/**
 * Send notification to driver based on their notification preferences
 */
export const sendDriverNotificationAlert = async (
  driverId: string,
  request: RideRequest & { user_profiles?: { full_name: string } },
  departureDistance: number,
  destinationDistance: number
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

    const notificationMessage = `🔔 **Ride Request Alert!**

You have a notification set up for this route and a passenger is looking for a ride!

👤 **Passenger:** ${passengerName}
📍 **Route:** ${request.departure_location} → ${request.destination_location}
📅 **When:** ${dateInfo}${timeInfo}
📏 **Distance:** ~${Math.round(departureDistance)}mi from your notification area
🔍 **Search Radius:** ${request.search_radius_miles} miles

${request.additional_notes ? `📝 **Notes:** ${request.additional_notes}\n\n` : ''}💡 **Action:** If you can provide this ride, post a matching ride or contact ${passengerName} directly!

📱 **Manage Notifications:** You can manage your ride notification preferences in your Profile → Notifications tab.`

    // Send system message to driver
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: '00000000-0000-0000-0000-000000000000', // System user
        receiver_id: driverId,
        message_content: notificationMessage,
        message_type: 'system',
        is_read: false
      })

    if (error) {
      throw error
    }

    console.log(`Driver notification alert sent to ${driverId}`)
  } catch (error) {
    console.error('Error sending driver notification alert:', error)
    throw error
  }
}

/**
 * Auto-expire old ride requests and notifications
 */
export const cleanupExpiredNotifications = async (): Promise<{
  expiredRequests: number
  expiredNotifications: number
  errors: string[]
}> => {
  return retryWithBackoff(async () => {
    const errors: string[] = []
    let expiredRequests = 0
    let expiredNotifications = 0

    try {
      // Clean up expired ride requests
      const { data: expiredRequestsData, error: requestsError } = await supabase
        .from('ride_requests')
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
        .from('ride_notifications')
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

    console.log('Cleanup completed:', { expiredRequests, expiredNotifications, errors })

    return {
      expiredRequests,
      expiredNotifications,
      errors
    }
  })
}