import { CarRide, Trip } from '../types'

export interface MessageTemplate {
  title: string
  message: string
  icon: string
}

export const getSystemMessageTemplate = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  ride?: CarRide,
  trip?: Trip
): MessageTemplate => {
  const rideDetails = getRideOrTripDetails(ride, trip)
  const rideType = ride ? 'car ride' : 'airport trip'
  const emoji = ride ? '🚗' : '✈️'

  switch (action) {
    case 'request':
      if (userRole === 'passenger') {
        return {
          title: 'Ride Request Sent',
          message: `${emoji} You have requested to join the ${rideDetails}. The ${ride ? 'driver' : 'traveler'} will be notified and can accept or decline your request.`,
          icon: '📤'
        }
      } else {
        return {
          title: 'New Ride Request',
          message: `${emoji} You have a new request for the ${rideDetails}. A passenger would like to join your ${rideType}.`,
          icon: '📥'
        }
      }

    case 'offer':
      if (userRole === 'owner') {
        return {
          title: 'Ride Offer Sent',
          message: `${emoji} You have sent a ride offer for the ${rideDetails}. The passenger can accept or decline this offer.`,
          icon: '🎁'
        }
      } else {
        return {
          title: 'Ride Offer Received',
          message: `${emoji} You have received a ride offer for the ${rideDetails}. The ${ride ? 'driver' : 'traveler'} is inviting you to join!`,
          icon: '🎉'
        }
      }

    case 'accept':
      if (userRole === 'owner') {
        return {
          title: 'Request Accepted',
          message: `✅ You have accepted a passenger for the ${rideDetails}. You can now coordinate pickup details and payment arrangements.`,
          icon: '✅'
        }
      } else {
        return {
          title: 'Request Accepted!',
          message: `🎉 Fantastic! Your request for the ${rideDetails} has been ACCEPTED! You can now coordinate pickup details and payment with the ${ride ? 'driver' : 'traveler'}.`,
          icon: '🎉'
        }
      }

    case 'reject':
      if (userRole === 'owner') {
        return {
          title: 'Request Declined',
          message: `❌ You have declined a passenger request for the ${rideDetails}. The passenger has been notified and can request again if needed.`,
          icon: '❌'
        }
      } else {
        return {
          title: 'Request Declined',
          message: `😔 Unfortunately, your request for the ${rideDetails} has been declined. Don't worry - you can request to join this ${rideType} again or find other options!`,
          icon: '😔'
        }
      }

    case 'cancel':
      if (userRole === 'owner') {
        return {
          title: 'Ride Cancelled',
          message: `🚫 You have cancelled the confirmed ${rideDetails}. The passenger has been notified. The ${rideType} is now available for new requests.`,
          icon: '🚫'
        }
      } else {
        return {
          title: 'Ride Cancelled',
          message: `😔 The ${ride ? 'driver' : 'traveler'} has cancelled the ${rideDetails}. You can request to join this ${rideType} again if it becomes available.`,
          icon: '😔'
        }
      }

    default:
      return {
        title: 'Ride Update',
        message: `${emoji} There has been an update regarding the ${rideDetails}.`,
        icon: '📢'
      }
  }
}

export const getRideOrTripDetails = (ride?: CarRide, trip?: Trip): string => {
  if (ride) {
    const date = new Date(ride.departure_date_time).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    const time = new Date(ride.departure_date_time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `car ride from ${ride.from_location} to ${ride.to_location} on ${date} at ${time}`
  }
  
  if (trip) {
    const date = new Date(trip.travel_date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
    const timeInfo = trip.departure_time 
      ? ` departing at ${trip.departure_time}${trip.departure_timezone ? ` (${trip.departure_timezone})` : ''}`
      : ''
    return `airport trip from ${trip.leaving_airport} to ${trip.destination_airport} on ${date}${timeInfo}`
  }
  
  return 'ride'
}

export const getNotificationTitle = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  ride?: CarRide,
  trip?: Trip
): string => {
  const template = getSystemMessageTemplate(action, userRole, ride, trip)
  return template.title
}

export const getNotificationMessage = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  ride?: CarRide,
  trip?: Trip
): string => {
  const template = getSystemMessageTemplate(action, userRole, ride, trip)
  return template.message
}

export const getNotificationIcon = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger'
): string => {
  const template = getSystemMessageTemplate(action, userRole)
  return template.icon
}