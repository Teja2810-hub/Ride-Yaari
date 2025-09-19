import React, { useState, useEffect } from 'react'
import { Bell, X, Check, Clock, AlertTriangle, Car, Plane, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideConfirmation } from '../types'

interface NotificationItem {
  id: string
  type: 'confirmation' | 'message' | 'system'
  title: string
  message: string
  icon: string
  timestamp: string
  read: boolean
  actionData?: any
}

interface NotificationBadgeProps {
  onStartChat?: (userId: string, userName: string, ride?: any, trip?: any) => void
  onViewConfirmations?: () => void
}

export default function NotificationBadge({ onStartChat, onViewConfirmations }: NotificationBadgeProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      
      // Subscribe to new confirmations and messages
      const subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ride_confirmations',
            filter: `ride_owner_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_confirmations',
            filter: `or(ride_owner_id.eq.${user.id},passenger_id.eq.${user.id})`,
          },
          () => {
            fetchNotifications()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const notifications: NotificationItem[] = []

      // Fetch pending confirmations where user is the owner
      const { data: pendingConfirmations } = await supabase
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
            departure_date_time
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date
          )
        `)
        .eq('ride_owner_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      // Add pending confirmation notifications
      if (pendingConfirmations) {
        pendingConfirmations.forEach(confirmation => {
          const ride = confirmation.car_rides
          const trip = confirmation.trips
          const rideType = ride ? 'car ride' : 'airport trip'
          const route = ride 
            ? `${ride.from_location} → ${ride.to_location}`
            : `${trip?.leaving_airport} → ${trip?.destination_airport}`

          notifications.push({
            id: `confirmation-${confirmation.id}`,
            type: 'confirmation',
            title: `New ${rideType} request`,
            message: `${confirmation.user_profiles.full_name} wants to join your ${route}`,
            icon: ride ? '🚗' : '✈️',
            timestamp: confirmation.created_at,
            read: false,
            actionData: {
              confirmationId: confirmation.id,
              userId: confirmation.passenger_id,
              userName: confirmation.user_profiles.full_name,
              ride: ride,
              trip: trip
            }
          })
        })
      }

      // Fetch recent unread messages
      const { data: unreadMessages } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:user_profiles!chat_messages_sender_id_fkey (
            id,
            full_name
          )
        `)
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10)

      // Add message notifications
      if (unreadMessages) {
        unreadMessages.forEach(message => {
          notifications.push({
            id: `message-${message.id}`,
            type: 'message',
            title: `New message from ${message.sender.full_name}`,
            message: message.message_content.length > 50 
              ? `${message.message_content.substring(0, 50)}...`
              : message.message_content,
            icon: '💬',
            timestamp: message.created_at,
            read: false,
            actionData: {
              userId: message.sender_id,
              userName: message.sender.full_name
            }
          })
        })
      }

      // Fetch recent status updates for user's confirmations
      const { data: statusUpdates } = await supabase
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
            departure_date_time
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date
          )
        `)
        .eq('passenger_id', user.id)
        .in('status', ['accepted', 'rejected'])
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('updated_at', { ascending: false })

      // Add status update notifications
      if (statusUpdates) {
        statusUpdates.forEach(confirmation => {
          const ride = confirmation.car_rides
          const trip = confirmation.trips
          const rideType = ride ? 'car ride' : 'airport trip'
          const route = ride 
            ? `${ride.from_location} → ${ride.to_location}`
            : `${trip?.leaving_airport} → ${trip?.destination_airport}`

          const isAccepted = confirmation.status === 'accepted'
          
          notifications.push({
            id: `status-${confirmation.id}`,
            type: 'system',
            title: isAccepted ? `Request Accepted! 🎉` : `Request Declined`,
            message: isAccepted 
              ? `Your request for the ${route} has been accepted! You can now coordinate details.`
              : `Your request for the ${route} was declined. You can try requesting again.`,
            icon: isAccepted ? '🎉' : '😔',
            timestamp: confirmation.updated_at,
            read: false,
            actionData: {
              confirmationId: confirmation.id,
              ride: ride,
              trip: trip
            }
          })
        })
      }

      // Sort all notifications by timestamp
      notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setNotifications(notifications)
      setUnreadCount(notifications.filter(n => !n.read).length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRideOrTripDetails = (ride?: CarRide, trip?: Trip): string => {
    if (ride) {
      const date = new Date(ride.departure_date_time).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
      return `${ride.from_location} → ${ride.to_location} on ${date}`
    }
    
    if (trip) {
      const date = new Date(trip.travel_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
      return `${trip.leaving_airport} → ${trip.destination_airport} on ${date}`
    }
    
    return 'ride'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`
    } else if (diffInMinutes < 1440) { // 24 hours
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const handleNotificationClick = (notification: NotificationItem) => {
    if (notification.type === 'confirmation' && onViewConfirmations) {
      setShowDropdown(false)
      onViewConfirmations()
    } else if (notification.type === 'message' && onStartChat) {
      setShowDropdown(false)
      onStartChat(
        notification.actionData.userId,
        notification.actionData.userName
      )
    } else if (notification.type === 'system' && onStartChat) {
      setShowDropdown(false)
      // For status updates, we could navigate to the specific confirmation
      if (onViewConfirmations) {
        onViewConfirmations()
      }
    }
  }

  const getNotificationIcon = (notification: NotificationItem) => {
    switch (notification.type) {
      case 'confirmation':
        return <Check size={16} className="text-yellow-600" />
      case 'message':
        return <MessageCircle size={16} className="text-blue-600" />
      case 'system':
        return <Bell size={16} className="text-purple-600" />
      default:
        return <Bell size={16} className="text-gray-600" />
    }
  }

  const getNotificationColor = (notification: NotificationItem) => {
    switch (notification.type) {
      case 'confirmation':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'message':
        return 'border-l-blue-500 bg-blue-50'
      case 'system':
        return 'border-l-purple-500 bg-purple-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
      >
        <Bell size={16} className="sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="fixed inset-x-2 top-16 sm:absolute sm:right-0 sm:top-full sm:inset-x-auto mt-2 w-auto sm:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[80vh] sm:max-h-96">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {unreadCount} new
                </span>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell size={32} className="text-gray-400 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">All caught up!</h4>
                <p className="text-gray-600 text-sm">No new notifications</p>
              </div>
            ) : (
              <>
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${getNotificationColor(notification)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        {notification.type === 'confirmation' && (
                          <div className="mt-2">
                            <span className="inline-flex items-center text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                              <Clock size={10} className="mr-1" />
                              Action Required
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {notifications.length > 10 && (
                  <div className="p-3 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-500">
                      Showing 10 of {notifications.length} notifications
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}