import React, { useState, useEffect } from 'react'
import { Bell, X, Check, Clock, TriangleAlert as AlertTriangle, Car, Plane, MessageCircle, ListFilter as Filter, BookMarked as MarkAsRead, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { notificationService, NotificationStats } from '../utils/notificationService'
import { RideConfirmation } from '../types'

interface NotificationItem {
  id: string
  type: 'confirmation_request' | 'confirmation_update' | 'message' | 'system'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'high' | 'medium' | 'low'
  actionData?: any
  rideData?: any
  tripData?: any
}

interface EnhancedNotificationBadgeProps {
  onStartChat?: (userId: string, userName: string, ride?: any, trip?: any) => void
  onViewConfirmations?: () => void
}

export default function EnhancedNotificationBadge({ 
  onStartChat, 
  onViewConfirmations 
}: EnhancedNotificationBadgeProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [stats, setStats] = useState<NotificationStats>({ pendingConfirmations: 0, unreadMessages: 0, recentUpdates: 0, total: 0 })
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'high' | 'confirmations' | 'messages'>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      fetchStats()
      
      // Subscribe to real-time updates
      const subscription = supabase
        .channel('enhanced_notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_confirmations',
            filter: `or(ride_owner_id.eq.${user.id},passenger_id.eq.${user.id})`,
          },
          () => {
            fetchNotifications()
            fetchStats()
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
            fetchStats()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new.is_read === true && payload.old.is_read === false) {
              fetchNotifications()
              fetchStats()
            }
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const fetchStats = async () => {
    if (!user) return
    
    try {
      const stats = await notificationService.getNotificationStats(user.id)
      setStats(stats)
    } catch (error) {
      console.error('Error fetching notification stats:', error)
    }
  }

  const fetchNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const notifications: NotificationItem[] = []

      // Fetch pending confirmations where user is the owner (HIGH PRIORITY)
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
            title: `🚨 Action Required: New ${rideType} request`,
            message: `${confirmation.user_profiles.full_name} is requesting to join your ${route}. Review and respond promptly.`,
            timestamp: confirmation.created_at,
            read: false,
            priority: 'high',
            actionData: {
              confirmationId: confirmation.id,
              userId: confirmation.passenger_id,
              userName: confirmation.user_profiles.full_name,
              ride: ride,
              trip: trip
            },
            rideData: ride,
            tripData: trip
          })
        })
      }

      // Fetch recent status updates for user's confirmations (HIGH/MEDIUM PRIORITY)
      const { data: statusUpdates } = await supabase
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
        .eq('passenger_id', user.id)
        .in('status', ['accepted', 'rejected'])
        .gte('updated_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()) // Last 48 hours
        .order('updated_at', { ascending: false })

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
            type: 'confirmation_update',
            title: isAccepted ? `🎉 Ride Confirmed!` : `😔 Request Declined`,
            message: isAccepted 
              ? `Your request for the ${route} has been accepted! Coordinate pickup details now.`
              : `Your request for the ${route} was declined. You can request again or find other rides.`,
            timestamp: confirmation.updated_at,
            read: false,
            priority: isAccepted ? 'high' : 'medium',
            actionData: {
              confirmationId: confirmation.id,
              userId: confirmation.ride_owner_id,
              userName: confirmation.user_profiles?.full_name || 'Ride Owner',
              ride: ride,
              trip: trip
            },
            rideData: ride,
            tripData: trip
          })
        })
      }

      // Fetch recent unread messages (MEDIUM PRIORITY)
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
        .limit(15)

      if (unreadMessages) {
        unreadMessages.forEach(message => {
          const isSystemMessage = message.message_type === 'system'
          const priority = isSystemMessage ? 'high' : 'medium'
          
          notifications.push({
            id: `message-${message.id}`,
            type: 'message',
            title: isSystemMessage 
              ? `🔔 System Update from ${message.sender.full_name}`
              : `💬 New message from ${message.sender.full_name}`,
            message: message.message_content.length > 80 
              ? `${message.message_content.substring(0, 80)}...`
              : message.message_content,
            timestamp: message.created_at,
            read: false,
            priority: priority,
            actionData: {
              userId: message.sender_id,
              userName: message.sender.full_name,
              messageId: message.id
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
      if (filter === 'high') {
        filteredNotifications = notifications.filter(n => n.priority === 'high')
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

  const handleNotificationClick = (notification: NotificationItem) => {
    if (notification.type === 'confirmation_request' || notification.type === 'confirmation_update') {
      if (onViewConfirmations) {
        setShowDropdown(false)
        onViewConfirmations()
      }
    } else if (notification.type === 'message' && onStartChat) {
      setShowDropdown(false)
      onStartChat(
        notification.actionData.userId,
        notification.actionData.userName,
        notification.rideData,
        notification.tripData
      )
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      // Mark all unread messages as read (including system messages)
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking messages as read:', error)
        throw error
      }

      console.log('All messages marked as read, refreshing stats...')

      // Clear local notifications state and refresh
      setNotifications([])
      await fetchStats()
      await fetchNotifications()
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const enableNotifications = async () => {
    const enabled = await notificationService.requestNotificationPermission()
    if (enabled) {
      await notificationService.sendTestNotification()
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
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const getNotificationIcon = (notification: NotificationItem) => {
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

  const getPriorityColor = (priority: string, type: string) => {
    if (type === 'confirmation_request') {
      return 'border-l-yellow-500 bg-yellow-50'
    }
    
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50'
      case 'medium':
        return 'border-l-blue-500 bg-blue-50'
      case 'low':
        return 'border-l-gray-500 bg-gray-50'
      default:
        return 'border-l-gray-300 bg-gray-50'
    }
  }

  const getPriorityBadge = (priority: string, type: string) => {
    if (type === 'confirmation_request') {
      return (
        <span className="inline-flex items-center text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full animate-pulse">
          <Zap size={10} className="mr-1" />
          Action Required
        </span>
      )
    }

    if (priority === 'high') {
      return (
        <span className="inline-flex items-center text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
          <AlertTriangle size={10} className="mr-1" />
          High Priority
        </span>
      )
    }

    return null
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'high':
        return notifications.filter(n => n.priority === 'high')
      case 'confirmations':
        return notifications.filter(n => 
          n.type === 'confirmation_request' || n.type === 'confirmation_update'
        )
      case 'messages':
        return notifications.filter(n => n.type === 'message')
      default:
        return notifications
    }
  }

  const filteredNotifications = getFilteredNotifications()

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-all duration-300 group"
      >
        <div className="relative">
          <Bell size={16} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
          {stats.total > 0 && (
            <>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              {stats.pendingConfirmations > 0 && (
                <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-500 rounded-full animate-bounce"></div>
              )}
            </>
          )}
        </div>
        <span className="hidden sm:inline">Notifications</span>
        {stats.total > 0 && (
          <span className={`absolute -top-1 -right-1 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-bold ${
            stats.pendingConfirmations > 0 
              ? 'bg-yellow-500 animate-bounce' 
              : stats.recentUpdates > 0 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-blue-500 animate-pulse'
          }`}>
            {stats.total > 99 ? '99+' : stats.total}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="fixed inset-x-2 top-16 sm:absolute sm:right-0 sm:top-full sm:inset-x-auto mt-2 w-auto sm:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-3">
              <Bell size={20} className="text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            </div>
            <div className="flex items-center space-x-2">
              {stats.total > 0 && (
                <div className="flex items-center space-x-2">
                  {stats.pendingConfirmations > 0 && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full animate-pulse">
                      {stats.pendingConfirmations} urgent
                    </span>
                  )}
                  {stats.recentUpdates > 0 && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {stats.recentUpdates} updates
                    </span>
                  )}
                  {stats.unreadMessages > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {stats.unreadMessages} messages
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <Filter size={14} />
                <span>Filters</span>
              </button>
              
              {notifications.filter(n => !n.read).length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <MarkAsRead size={14} />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All', count: notifications.length },
                  { key: 'high', label: 'High Priority', count: notifications.filter(n => n.priority === 'high').length },
                  { key: 'confirmations', label: 'Confirmations', count: notifications.filter(n => n.type.includes('confirmation')).length },
                  { key: 'messages', label: 'Messages', count: notifications.filter(n => n.type === 'message').length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-1 px-1 rounded-full text-xs ${
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
            )}

            {/* Quick Stats */}
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <div className="bg-white rounded-lg p-2">
                <div className="text-lg font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2">
                <div className="text-lg font-bold text-yellow-600">{stats.pendingConfirmations}</div>
                <div className="text-xs text-yellow-800">Pending</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-lg font-bold text-green-600">{stats.recentUpdates}</div>
                <div className="text-xs text-green-800">Updates</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-lg font-bold text-blue-600">{stats.unreadMessages}</div>
                <div className="text-xs text-blue-800">Messages</div>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 280px)' }}>
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell size={32} className="text-gray-400 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">
                  {filter === 'all' ? 'All caught up!' : `No ${filter} notifications`}
                </h4>
                <p className="text-gray-600 text-sm">
                  {filter === 'all' 
                    ? 'No new notifications. New updates will appear here.'
                    : `No ${filter} notifications found.`
                  }
                </p>
                {Notification.permission !== 'granted' && (
                  <button
                    onClick={enableNotifications}
                    className="mt-3 flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Bell size={14} />
                    <span>Enable Browser Notifications</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-l-4 ${getPriorityColor(notification.priority, notification.type)}`}
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
                          <div className="flex items-center space-x-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            )}
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center space-x-2">
                          {getPriorityBadge(notification.priority, notification.type)}
                          
                          {(notification.rideData || notification.tripData) && (
                            <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              {notification.rideData ? (
                                <Car size={10} className="mr-1 text-green-600" />
                              ) : (
                                <Plane size={10} className="mr-1 text-blue-600" />
                              )}
                              {notification.rideData ? 'Car Ride' : 'Airport Trip'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredNotifications.length > 10 && (
                  <div className="p-3 border-t border-gray-200 text-center bg-gray-50">
                    <p className="text-sm text-gray-500">
                      Showing {Math.min(10, filteredNotifications.length)} of {filteredNotifications.length} notifications
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Actions */}
          {stats.total > 0 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {filteredNotifications.filter(n => !n.read).length} unread
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchNotifications}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Refresh
                  </button>
                  {onViewConfirmations && stats.pendingConfirmations > 0 && (
                    <button
                      onClick={() => {
                        setShowDropdown(false)
                        onViewConfirmations()
                      }}
                      className="bg-yellow-500 text-white px-3 py-1 rounded-lg font-medium hover:bg-yellow-600 transition-colors animate-pulse"
                    >
                      Review {stats.pendingConfirmations} Request{stats.pendingConfirmations !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}