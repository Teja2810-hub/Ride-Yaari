import React, { useState, useEffect } from 'react'
import { Bell, X, Check, Clock, MessageCircle, Car, Plane, AlertTriangle, ListFilter as Filter } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import LoadingSpinner from './LoadingSpinner'

interface NotificationHistoryProps {
  onStartChat?: (userId: string, userName: string) => void
}

interface HistoryNotification {
  id: string
  notification_type: string
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
  is_read: boolean
  created_at: string
  related_user_id?: string
  related_user_name?: string
  action_data?: any
}

export default function NotificationHistory({ onStartChat }: NotificationHistoryProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<HistoryNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'ride_match' | 'trip_match' | 'ride_request_alert' | 'trip_request_alert'>('all')
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all')

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user, filter, readFilter])

  const fetchNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      let query = supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('notification_type', filter)
      }

      if (readFilter === 'read') {
        query = query.eq('is_read', true)
      } else if (readFilter === 'unread') {
        query = query.eq('is_read', false)
      }

      const { data, error } = await query

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notification history:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      await fetchNotifications()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!user) return

    try {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
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
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    if (type.includes('ride_match')) {
      return <Car size={20} className="text-green-600" />
    } else if (type.includes('trip_match')) {
      return <Plane size={20} className="text-blue-600" />
    } else if (type.includes('alert')) {
      return <Bell size={20} className="text-yellow-600" />
    }
    return <Bell size={20} className="text-gray-600" />
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

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'ride_match':
        return 'Ride Match'
      case 'trip_match':
        return 'Trip Match'
      case 'ride_request_alert':
        return 'Ride Request'
      case 'trip_request_alert':
        return 'Trip Request'
      default:
        return 'Notification'
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading notification history..." />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Notification History</h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <Check size={16} />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter size={16} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">All Types</option>
              <option value="ride_match">Ride Matches</option>
              <option value="trip_match">Trip Matches</option>
              <option value="ride_request_alert">Ride Request Alerts</option>
              <option value="trip_request_alert">Trip Request Alerts</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''} found
            </span>
            {unreadCount > 0 && (
              <span className="text-sm font-medium text-blue-600">
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600">
              You don't have any notifications matching the selected filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-l-4 ${getPriorityColor(notification.priority)} ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm">
                    {getNotificationIcon(notification.notification_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`font-semibold text-gray-900 ${!notification.is_read ? 'font-bold' : ''}`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          {getNotificationTypeLabel(notification.notification_type)}
                        </span>
                      </div>

                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {notification.priority === 'high' && (
                          <span className="inline-flex items-center text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                            <AlertTriangle size={10} className="mr-1" />
                            High Priority
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {notification.related_user_id && onStartChat && (
                          <button
                            onClick={() => onStartChat(notification.related_user_id!, notification.related_user_name || 'User')}
                            className="inline-flex items-center space-x-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <MessageCircle size={12} />
                            <span>Chat</span>
                          </button>
                        )}

                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="inline-flex items-center space-x-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Check size={12} />
                            <span>Mark Read</span>
                          </button>
                        )}

                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="inline-flex items-center space-x-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <X size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">About Notification History</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• View all your past notifications in one place</li>
          <li>• Filter by type and read status</li>
          <li>• Click "Chat" to start a conversation with the related user</li>
          <li>• Mark notifications as read or delete them</li>
          <li>• Notifications are stored permanently until you delete them</li>
        </ul>
      </div>
    </div>
  )
}
