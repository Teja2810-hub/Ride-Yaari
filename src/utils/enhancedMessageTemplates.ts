import { CarRide, Trip } from '../types'

export interface EnhancedMessageTemplate {
  title: string
  message: string
  icon: string
  priority: 'high' | 'medium' | 'low'
  category: 'confirmation' | 'update' | 'system'
  actionRequired: boolean
}

export const getEnhancedSystemMessageTemplate = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  ride?: CarRide,
  trip?: Trip,
  passengerName?: string,
  ownerName?: string
): EnhancedMessageTemplate => {
  const rideDetails = getDetailedRideOrTripInfo(ride, trip)
  const rideType = ride ? 'car ride' : 'airport trip'
  const emoji = ride ? '🚗' : '✈️'
  const routeEmoji = ride ? '🛣️' : '✈️'
  const timeEmoji = '⏰'
  const moneyEmoji = '💰'

  switch (action) {
    case 'request':
      if (userRole === 'passenger') {
        return {
          title: '📤 Request Sent',
          message: `Your ride request has been sent successfully. The ${ride ? 'driver' : 'traveler'} will be notified.`,
          icon: '📤',
          priority: 'medium',
          category: 'confirmation',
          actionRequired: false
        }
      } else {
        return {
          title: '🚨 New Ride Request',
          message: `New request from ${passengerName || 'a passenger'} for your ${rideDetails.route}. Tap to review.`,
          icon: '🚨',
          priority: 'high',
          category: 'confirmation',
          actionRequired: true
        }
      }

    case 'offer':
      if (userRole === 'owner') {
        return {
          title: '🎁 Ride Offer Sent',
          message: `${emoji} **Ride Offer Sent Successfully!**\n\n👤 **To:** ${passengerName || 'Passenger'}\n${routeEmoji} **Route:** ${rideDetails.route}\n${timeEmoji} **When:** ${rideDetails.timing}\n${moneyEmoji} **Price:** ${rideDetails.pricing}\n\n✅ Your ride offer has been sent. The passenger can accept or decline this invitation.\n\n💡 **What's Next:** Wait for the passenger to respond. You'll be notified of their decision.`,
          icon: '🎁',
          priority: 'medium',
          category: 'confirmation',
          actionRequired: false
        }
      } else {
        return {
          title: '🎉 Ride Offer Received!',
          message: `${emoji} **You've Got a Ride Offer!**\n\n👤 **From:** ${ownerName || 'Driver'}\n${routeEmoji} **Route:** ${rideDetails.route}\n${timeEmoji} **Departure:** ${rideDetails.timing}\n${moneyEmoji} **Price:** ${rideDetails.pricing}\n\n🎉 **Great News:** The ${ride ? 'driver' : 'traveler'} is inviting you to join their ${rideType}!\n\n💡 **Action Required:** Please respond to this offer promptly. You can accept or decline based on your needs.`,
          icon: '🎉',
          priority: 'high',
          category: 'confirmation',
          actionRequired: true
        }
      }

    case 'accept':
      if (userRole === 'owner') {
        return {
          title: '✅ Passenger Confirmed',
          message: `${emoji} **Passenger Accepted Successfully!**\n\n👤 **Passenger:** ${passengerName || 'Traveler'}\n${routeEmoji} **Route:** ${rideDetails.route}\n${timeEmoji} **Departure:** ${rideDetails.timing}\n${moneyEmoji} **Agreed Price:** ${rideDetails.pricing}\n\n✅ **Status:** Confirmed! You now have a passenger for your ${rideType}.\n\n📱 **Next Steps:**\n• Exchange contact details for coordination\n• Confirm exact pickup location and time\n• Discuss payment method and timing\n• Share any special instructions`,
          icon: '✅',
          priority: 'high',
          category: 'update',
          actionRequired: true
        }
      } else {
        return {
          title: '🎉 Request Accepted - You\'re In!',
          message: `${emoji} **FANTASTIC NEWS! 🎉**\n\n✅ **Status:** Your request has been **ACCEPTED**!\n${routeEmoji} **Route:** ${rideDetails.route}\n${timeEmoji} **Departure:** ${rideDetails.timing}\n${moneyEmoji} **Price:** ${rideDetails.pricing}\n\n🎊 **Congratulations!** You're now confirmed for this ${rideType}!\n\n📱 **Important Next Steps:**\n• Contact the ${ride ? 'driver' : 'traveler'} to coordinate details\n• Confirm exact pickup location and time\n• Arrange payment method\n• Be ready at the agreed time and location`,
          icon: '🎉',
          priority: 'high',
          category: 'update',
          actionRequired: true
        }
      }

    case 'reject':
      if (userRole === 'owner') {
        return {
          title: '❌ Request Declined',
          message: `${emoji} **Request Declined**\n\n👤 **Passenger:** ${passengerName || 'Traveler'}\n${routeEmoji} **Route:** ${rideDetails.route}\n${timeEmoji} **Departure:** ${rideDetails.timing}\n\n❌ **Status:** You have declined this passenger request.\n\n💡 **Note:** The passenger has been notified and can request again if they wish. Your ${rideType} remains available for other requests.`,
          icon: '❌',
          priority: 'low',
          category: 'update',
          actionRequired: false
        }
      } else {
        return {
          title: '😔 Request Declined',
          message: `${emoji} **Request Update**\n\n${routeEmoji} **Route:** ${rideDetails.route}\n${timeEmoji} **Departure:** ${rideDetails.timing}\n${moneyEmoji} **Price:** ${rideDetails.pricing}\n\n😔 **Unfortunately,** your request for this ${rideType} has been declined.\n\n🌟 **Don't Give Up!**\n• You can request to join this ${rideType} again\n• The ${ride ? 'driver' : 'traveler'} might reconsider\n• Check out other available ${ride ? 'rides' : 'trips'} on your route\n• Consider adjusting your travel dates for more options`,
          icon: '😔',
          priority: 'medium',
          category: 'update',
          actionRequired: false
        }
      }

    case 'cancel':
      if (userRole === 'owner') {
        return {
          title: '🚫 Ride Cancelled',
          message: `${emoji} **Ride Cancellation Notice**\n\n👤 **Affected Passenger:** ${passengerName || 'Passenger'}\n${routeEmoji} **Route:** ${rideDetails.route}\n${timeEmoji} **Was Scheduled:** ${rideDetails.timing}\n\n🚫 **Status:** You have cancelled this confirmed ${rideType}.\n\n📢 **Passenger Notified:** The passenger has been informed of the cancellation. Your ${rideType} is now available for new requests.\n\n💡 **Tip:** Consider explaining the reason to maintain good relationships with the community.`,
          icon: '🚫',
          priority: 'medium',
          category: 'update',
          actionRequired: false
        }
      } else {
        return {
          title: '😔 Ride Cancelled by Driver',
          message: `${emoji} **Ride Cancellation Notice**\n\n${routeEmoji} **Route:** ${rideDetails.route}\n${timeEmoji} **Was Scheduled:** ${rideDetails.timing}\n${moneyEmoji} **Price:** ${rideDetails.pricing}\n\n😔 **Unfortunately,** the ${ride ? 'driver' : 'traveler'} has cancelled your confirmed ${rideType}.\n\n🔄 **Your Options:**\n• Request to join this ${rideType} again if it becomes available\n• Search for alternative ${ride ? 'rides' : 'trips'} on your route\n• Post your own ${rideType} to find other travelers\n• Contact support if you need assistance`,
          icon: '😔',
          priority: 'high',
          category: 'update',
          actionRequired: false
        }
      }

    default:
      return {
        title: '📢 Ride Update',
        message: `${emoji} **System Update**\n\n${routeEmoji} **Route:** ${rideDetails.route}\n\nThere has been an update regarding your ${rideType}. Please check your confirmations for more details.`,
        icon: '📢',
        priority: 'medium',
        category: 'system',
        actionRequired: false
      }
  }
}

export const getDetailedRideOrTripInfo = (ride?: CarRide, trip?: Trip) => {
  if (ride) {
    const date = new Date(ride.departure_date_time)
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    
    const pricing = ride.price 
      ? `${ride.currency || 'USD'} ${ride.price}${ride.negotiable ? ' (negotiable)' : ''}`
      : 'Free'

    return {
      route: `${ride.from_location} → ${ride.to_location}`,
      timing: `${formattedDate} at ${formattedTime}`,
      pricing: pricing,
      type: 'car ride'
    }
  }
  
  if (trip) {
    const date = new Date(trip.travel_date)
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    let timing = formattedDate
    if (trip.departure_time) {
      timing += ` departing at ${trip.departure_time}`
      if (trip.departure_timezone) {
        timing += ` (${trip.departure_timezone})`
      }
    }
    
    const pricing = trip.price 
      ? `${trip.currency || 'USD'} ${trip.price}${trip.negotiable ? ' (negotiable)' : ''} service fee`
      : 'Free assistance'

    return {
      route: `${trip.leaving_airport} → ${trip.destination_airport}`,
      timing: timing,
      pricing: pricing,
      type: 'airport trip'
    }
  }
  
  return {
    route: 'Unknown route',
    timing: 'Unknown timing',
    pricing: 'Unknown pricing',
    type: 'ride'
  }
}

export const getNotificationTitle = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  ride?: CarRide,
  trip?: Trip,
  passengerName?: string,
  ownerName?: string
): string => {
  const template = getEnhancedSystemMessageTemplate(action, userRole, ride, trip, passengerName, ownerName)
  return template.title
}

export const getNotificationMessage = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  ride?: CarRide,
  trip?: Trip,
  passengerName?: string,
  ownerName?: string
): string => {
  const template = getEnhancedSystemMessageTemplate(action, userRole, ride, trip, passengerName, ownerName)
  return template.message
}

export const getNotificationPriority = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger'
): 'high' | 'medium' | 'low' => {
  const template = getEnhancedSystemMessageTemplate(action, userRole)
  return template.priority
}

export const isActionRequired = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger'
): boolean => {
  const template = getEnhancedSystemMessageTemplate(action, userRole)
  return template.actionRequired
}

// Message templates for different scenarios
export const getContextualMessage = (
  scenario: 'first_time_user' | 'repeat_passenger' | 'frequent_driver' | 'international_trip' | 'same_day_trip',
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger'
): string => {
  const baseTemplate = getEnhancedSystemMessageTemplate(action, userRole)
  
  switch (scenario) {
    case 'first_time_user':
      return baseTemplate.message + '\n\n🌟 **Welcome to RideYaari!** This is your first ride confirmation. Our community is here to help make your travel experience smooth and safe.'
    
    case 'repeat_passenger':
      return baseTemplate.message + '\n\n🎯 **Great Choice!** You\'ve used RideYaari before. Thanks for being part of our trusted travel community!'
    
    case 'frequent_driver':
      return baseTemplate.message + '\n\n⭐ **Experienced Driver!** Thanks for consistently offering rides and helping fellow travelers. Your contribution makes RideYaari amazing!'
    
    case 'international_trip':
      return baseTemplate.message + '\n\n🌍 **International Trip:** Please ensure you have all necessary travel documents and are aware of any customs regulations for your destination.'
    
    case 'same_day_trip':
      return baseTemplate.message + '\n\n⚡ **Same-Day Trip:** This is a same-day request. Please coordinate quickly and confirm all details before departure.'
    
    default:
      return baseTemplate.message
  }
}

// Email template formatting
export const getEmailTemplate = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  ride?: CarRide,
  trip?: Trip,
  recipientName?: string
): { subject: string; htmlBody: string; textBody: string } => {
  const template = getEnhancedSystemMessageTemplate(action, userRole, ride, trip)
  const rideDetails = getDetailedRideOrTripInfo(ride, trip)
  
  const subject = `RideYaari: ${template.title.replace(/[🚨📤🎉✅❌😔🚫📢]/g, '').trim()}`
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center; }
        .content { padding: 24px; }
        .ride-details { background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
        .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 14px; color: #64748b; }
        .priority-high { border-left: 4px solid #ef4444; }
        .priority-medium { border-left: 4px solid #f59e0b; }
        .priority-low { border-left: 4px solid #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${template.icon} RideYaari</h1>
          <h2>${template.title}</h2>
        </div>
        <div class="content priority-${template.priority}">
          <p>Hi ${recipientName || 'there'},</p>
          <div class="ride-details">
            <h3>📍 Trip Details</h3>
            <p><strong>Route:</strong> ${rideDetails.route}</p>
            <p><strong>Timing:</strong> ${rideDetails.timing}</p>
            <p><strong>Price:</strong> ${rideDetails.pricing}</p>
          </div>
          <div style="white-space: pre-line;">${template.message}</div>
          ${template.actionRequired ? '<a href="https://rideyaari.com" class="button">Take Action on RideYaari</a>' : ''}
        </div>
        <div class="footer">
          <p>This email was sent by RideYaari. Visit <a href="https://rideyaari.com">rideyaari.com</a> to manage your notifications.</p>
          <p>Made with ❤️ in India</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const textBody = `
${template.title}

Hi ${recipientName || 'there'},

Trip Details:
Route: ${rideDetails.route}
Timing: ${rideDetails.timing}
Price: ${rideDetails.pricing}

${template.message.replace(/\*\*/g, '').replace(/\n/g, '\n')}

${template.actionRequired ? 'Visit https://rideyaari.com to take action.' : ''}

---
This email was sent by RideYaari.
Visit rideyaari.com to manage your notifications.
Made with ❤️ in India
  `

  return { subject, htmlBody, textBody }
}

// Push notification templates for mobile apps (future use)
export const getPushNotificationTemplate = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  ride?: CarRide,
  trip?: Trip
) => {
  const template = getEnhancedSystemMessageTemplate(action, userRole, ride, trip)
  
  return {
    title: template.title,
    body: template.message.split('\n')[0], // First line for push notification
    icon: template.icon,
    badge: template.priority === 'high' ? '🚨' : template.priority === 'medium' ? '🔔' : '📢',
    sound: template.priority === 'high' ? 'urgent.wav' : 'default.wav',
    vibrate: template.priority === 'high' ? [200, 100, 200, 100, 200] : [200, 100, 200],
    actions: template.actionRequired ? [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ] : [
      { action: 'dismiss', title: 'OK' }
    ]
  }
}