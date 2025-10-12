import React, { useState, useEffect } from 'react'
import { Bell, X, Check, Clock, TriangleAlert as AlertTriangle, Car, Plane, MessageCircle, ListFilter as Filter, BookMarked as MarkAsRead } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { getSystemMessageTemplate } from '../utils/messageTemplates'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  onStartChat?: (userId: string, userName: string, ride?: any, trip?: any, showRequestButtons?: boolean) => void
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
  const [filter, setFilter] = useState<'all' | 'unread' | 'confirmations' | 'messages' | 'history'>('unread')
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications()
    }
  }, [isOpen, user, filter, showHistory])

  const fetchNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const notifications: Notification[] = []

      // Fetch persistent notifications
      const query = supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Show all in history view, apply filter in normal view
      const { data: persistentNotifications } = showHistory
        ? await query.limit(200)
        : filter === 'unread'
          ? await query.eq('is_read', false).limit(50)
          : await query.limit(50)

      if (persistentNotifications) {
        persistentNotifications.forEach(notif => {
          notifications.push({
            id: `persistent-${notif.id}`,
            type: notif.notification_type as any,
            title: notif.title,
            message: notif.message,
            timestamp: notif.created_at,
            read: notif.is_read,
            priority: notif.priority as any,
            actionData: {
              ...notif.action_data,
              userId: notif.related_user_id,
              userName: notif.related_user_name
            }
          })
        })
      }

      // Skip pending confirmations - they should only show in confirmations tab
      // const { data: pendingConfirmations } = ...

      // Removed - confirmations should only show in confirmations tab

      // Skip confirmation updates - they should only show in confirmations tab
      // const { data: confirmationUpdates } = ...

      // Skip unread messages - they should show in messages tab only
      // const { data: unreadMessages } = ...

      // Sort all notifications by priority and timestamp
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
      } else if (filter === 'history') {
        // Show all notifications in history
        filteredNotifications = notifications
      }

      setNotifications(filteredNotifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark notification as read
    if (!notification.read && user) {
      try {
        if (notification.id.startsWith('persistent-')) {
          const notifId = notification.id.replace('persistent-', '')
          await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('id', notifId)
        } else if (notification.type === 'message') {
          const messageId = notification.id.replace('message-', '')
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('id', messageId)
        }
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Close notification center
    onClose()

    if (notification.type === 'confirmation_request' || notification.type === 'confirmation_update') {
      if (onViewConfirmations) {
        onViewConfirmations()
      }
    } else if (
      (notification.type === 'message' ||
       notification.type === 'ride_match' ||
       notification.type === 'trip_match' ||
       notification.type === 'ride_request_alert' ||
       notification.type === 'trip_request_alert') &&
      onStartChat &&
      notification.actionData?.userId
    ) {
      const showRequestButtons = notification.type === 'ride_match' || notification.type === 'trip_match'
      onStartChat(
        notification.actionData.userId,
        notification.actionData.userName || 'User',
        undefined,
        undefined,
        showRequestButtons
      )
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const { error: notifError } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (notifError) {
        console.error('Error marking notifications as read:', notifError)
        return
      }

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
        <div className="flex items-center space-x-1 p-4 border-b border-gray-200 bg-gray-50 overflow-x-auto">
          {[
            { key: 'all', label: 'All', count: notifications.length },
            { key: 'unread', label: 'Unread', count: notifications.filter(n => !n.read).length },
            { key: 'history', label: 'History', count: 0 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key as any)
                setShowHistory(tab.key === 'history')
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count > 0 && tab.key !== 'history' && (
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
                  className={`p-4 border-l-4 ${getPriorityColor(notification.priority)} ${
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
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>

                      {/* Action indicators and buttons */}
                      <div className="flex items-center justify-between">
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

                        {/* Action button for ride/trip match and request alerts */}
                        {(notification.type === 'ride_match' ||
                          notification.type === 'trip_match' ||
                          notification.type === 'ride_request_alert' ||
                          notification.type === 'trip_request_alert' ||
                          notification.type === 'message') &&
                          notification.actionData?.userId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNotificationClick(notification)
                            }}
                            className="inline-flex items-center space-x-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <MessageCircle size={12} />
                            <span>Chat with {notification.actionData.userName || 'User'}</span>
                          </button>
                        )}

                        {/* Action button for confirmations */}
                        {(notification.type === 'confirmation_request' ||
                          notification.type === 'confirmation_update') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleNotificationClick(notification)
                            }}
                            className="inline-flex items-center space-x-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Check size={12} />
                            <span>View Details</span>
                          </button>
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