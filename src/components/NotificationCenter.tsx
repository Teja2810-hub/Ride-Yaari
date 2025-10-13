import React, { useState, useEffect } from 'react'
import { Bell, X, Check, Clock, TriangleAlert as AlertTriangle, Car, Plane, MessageCircle, ListFilter as Filter, BookMarked as MarkAsRead } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { getSystemMessageTemplate } from '../utils/messageTemplates'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  onStartChat?: (userId: string, userName: string, ride?: any, trip?: any) => void
  onViewConfirmations?: () => void
}

interface Notification {
  id: string
  type: 'confirmation_request' | 'confirmation_update' | 'message' | 'system'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionData?: any
  priority: 'high' | 'medium' | 'low'
}

export default function NotificationCenter({ 
  isOpen, 
  onClose, 
  onStartChat, 
  onViewConfirmations 
}: NotificationCenterProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'confirmations' | 'messages'>('all')

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications()
    }
  }, [isOpen, user, filter])

  const fetchNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const notifications: Notification[] = []

      // Fetch pending confirmations (high priority)
      const { data: pendingConfirmations } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name,
            profile_image_url
          ),
          car_rides!ride_confirmations_ride_id_fkey (
            id,
            from_location,
            to_location,
            departure_date_time,
            price,
            currency
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date,
            price,
            currency
          )
        `)
        .eq('ride_owner_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

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
            type: 'confirmation_request',
            title: `🚨 New ${rideType} request`,
            message: `${confirmation.user_profiles.full_name} is requesting to join your ${route}. Action required.`,
            timestamp: confirmation.created_at,
            read: false,
            priority: 'high',
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

      // Fetch recent confirmation updates (medium priority)
      const { data: confirmationUpdates } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_ride_owner_id_fkey (
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
        .gte('updated_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Last 48 hours
        .order('updated_at', { ascending: false })

      if (confirmationUpdates) {
        confirmationUpdates.forEach(confirmation => {
          const ride = confirmation.car_rides
          const trip = confirmation.trips
          const rideType = ride ? 'car ride' : 'airport trip'
          const route = ride 
            ? `${ride.from_location} → ${ride.to_location}`
            : `${trip?.leaving_airport} → ${trip?.destination_airport}`
          const isAccepted = confirmation.status === 'accepted'

          notifications.push({
            id: `update-${confirmation.id}`,
            type: 'confirmation_update',
            title: isAccepted ? `🎉 Ride Confirmed!` : `😔 Request Declined`,
            message: isAccepted 
              ? `Your request for the ${route} has been accepted! Coordinate pickup details now.`
              : `Your request for the ${route} was declined. You can request again or find other rides.`,
            timestamp: confirmation.updated_at,
            read: false,
            priority: confirmation.status === 'accepted' ? 'high' : 'medium',
            actionData: {
              confirmationId: confirmation.id,
              userId: confirmation.ride_owner_id,
              userName: confirmation.user_profiles?.full_name || 'Ride Owner',
              ride: ride,
              trip: trip
            }
          })
        })
      }

      // Fetch unread messages (medium priority)
      const { data: unreadMessages } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:user_profiles!chat_messages_sender_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)

      if (unreadMessages) {
        unreadMessages.forEach(message => {
          notifications.push({
            id: `message-${message.id}`,
            type: 'message',
            title: `New message from ${message.sender.full_name}`,
            message: message.message_content.length > 80 
              ? `${message.message_content.substring(0, 80)}...`
              : message.message_content,
            timestamp: message.created_at,
            read: false,
            priority: 'medium',
            actionData: {
              userId: message.sender_id,
              userName: message.sender.full_name
            }
          })
        })
      }

      // Sort notifications by priority and timestamp
      notifications.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

      // Apply filter
      let filteredNotifications = notifications
      if (filter === 'unread') {
        filteredNotifications = notifications.filter(n => !n.read)
      } else if (filter === 'confirmations') {
        filteredNotifications = notifications.filter(n => 
          n.type === 'confirmation_request' || n.type === 'confirmation_update'
        )
      } else if (filter === 'messages') {
        filteredNotifications = notifications.filter(n => n.type === 'message')
      }

      setNotifications(filteredNotifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark this notification as read immediately
    if (!notification.read && notification.type === 'message' && user) {
      try {
        // Extract message ID from notification ID (format: "message-{messageId}")
        const messageId = notification.id.replace('message-', '')
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('id', messageId)
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Close notification center after marking as read
    onClose()

    if (notification.type === 'confirmation_request' || notification.type === 'confirmation_update') {
      if (onViewConfirmations) {
        onViewConfirmations()
      }
    } else if (notification.type === 'message' && onStartChat) {
      onStartChat(
        notification.actionData.userId,
        notification.actionData.userName
      )
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      console.log('NotificationCenter: Marking all messages as read for user:', user.id)

      // Get count of unread messages before marking
      const { count: beforeCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      console.log('NotificationCenter: Unread messages before:', beforeCount)

      // Mark all unread messages as read (including system messages)
      const { error, count } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('NotificationCenter: Error marking messages as read:', error)
        throw error
      }

      console.log('NotificationCenter: Marked', count, 'messages as read')

      // Verify the update
      const { count: afterCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      console.log('NotificationCenter: Unread messages after:', afterCount)

      // Clear all notifications immediately
      setNotifications([])

      // Wait a moment before refreshing to ensure DB is updated
      await new Promise(resolve => setTimeout(resolve, 500))

      // Refresh notifications from server
      await fetchNotifications()
    } catch (error) {
      console.error('NotificationCenter: Error in markAllAsRead:', error)
    }
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
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'confirmation_request':
        return <Clock size={16} className="text-yellow-600" />
      case 'confirmation_update':
        return notification.priority === 'high' 
          ? <Check size={16} className="text-green-600" />
          : <X size={16} className="text-red-600" />
      case 'message':
        return <MessageCircle size={16} className="text-blue-600" />
      default:
        return <Bell size={16} className="text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-gray-500'
      default:
        return 'border-l-gray-300'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bell size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Notification Center</h2>
          </div>
          <div className="flex items-center space-x-3">
            {notifications.filter(n => !n.read).length > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                <Check size={16} />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 p-4 border-b border-gray-200 bg-gray-50">
          {[
            { key: 'all', label: 'All', count: notifications.length },
            { key: 'unread', label: 'Unread', count: notifications.filter(n => !n.read).length },
            { key: 'confirmations', label: 'Confirmations', count: notifications.filter(n => n.type.includes('confirmation')).length },
            { key: 'messages', label: 'Messages', count: notifications.filter(n => n.type === 'message').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  filter === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading notifications...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
              </h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'You\'re all caught up! New notifications will appear here.'
                  : `No ${filter} notifications found. Try changing the filter.`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-semibold text-gray-900 text-sm ${!notification.read ? 'font-bold' : ''}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      
                      {/* Action indicators */}
                      <div className="flex items-center space-x-2">
                        {notification.type === 'confirmation_request' && (
                          <span className="inline-flex items-center text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            <Clock size={10} className="mr-1" />
                            Action Required
                          </span>
                        )}
                        {notification.priority === 'high' && (
                          <span className="inline-flex items-center text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                            <AlertTriangle size={10} className="mr-1" />
                            High Priority
                          </span>
                        )}
                        {notification.type.includes('confirmation') && (
                          <span className="inline-flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {notification.actionData?.ride ? (
                              <Car size={10} className="mr-1" />
                            ) : (
                              <Plane size={10} className="mr-1" />
                            )}
                            {notification.actionData?.ride ? 'Car Ride' : 'Airport Trip'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {notifications.filter(n => !n.read).length} unread of {notifications.length} total
              </span>
              <button
                onClick={fetchNotifications}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}