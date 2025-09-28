import React, { useState, useEffect } from 'react'
import { Bell, Trash2, MapPin, Calendar, Clock, Search, ListFilter as Filter, RefreshCw, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideNotification } from '../types'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface NotificationManagementProps {
  onBack?: () => void
}

type FilterType = 'all' | 'passenger_request' | 'driver_post'
type SortOption = 'date-desc' | 'date-asc' | 'expiry-asc' | 'expiry-desc'

export default function NotificationManagement({ onBack }: NotificationManagementProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [notifications, setNotifications] = useState<RideNotification[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [showFilters, setShowFilters] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState<{
    show: boolean
    notification: RideNotification | null
  }>({ show: false, notification: null })

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    await handleAsync(async () => {
      const { data, error } = await supabase
        .from('ride_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setNotifications(data || [])
    })
  }

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return

    setShowDeleteModal({ show: false, notification: null })
    setDeletingId(notificationId)

    await handleAsync(async () => {
      const { error } = await supabase
        .from('ride_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      setSuccessMessage('Notification deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    }).finally(() => {
      setDeletingId(null)
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getExpiryStatus = (notification: RideNotification) => {
    if (!notification.expires_at) return { status: 'no-expiry', text: 'No expiry', color: 'text-gray-600' }
    
    const expiryDate = new Date(notification.expires_at)
    const now = new Date()
    
    if (expiryDate <= now) {
      return { status: 'expired', text: 'Expired', color: 'text-red-600' }
    }
    
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursUntilExpiry <= 24) {
      return { status: 'expiring-soon', text: `Expires in ${Math.ceil(hoursUntilExpiry)}h`, color: 'text-orange-600' }
    }
    
    const daysUntilExpiry = Math.ceil(hoursUntilExpiry / 24)
    return { status: 'active', text: `Expires in ${daysUntilExpiry}d`, color: 'text-green-600' }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'passenger_request':
        return 'Passenger Request Alert'
      case 'driver_post':
        return 'Driver Post Alert'
      default:
        return 'Unknown'
    }
  }

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'passenger_request':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'driver_post':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDateTypeDisplay = (notification: RideNotification) => {
    switch (notification.date_type) {
      case 'specific_date':
        return notification.specific_date ? formatDate(notification.specific_date) : 'Specific date'
      case 'multiple_dates':
        return notification.multiple_dates && notification.multiple_dates.length > 0
          ? `${notification.multiple_dates.length} dates`
          : 'Multiple dates'
      case 'month':
        return notification.notification_month || 'Month'
      default:
        return 'Unknown'
    }
  }

  const filteredAndSortedNotifications = () => {
    let filtered = notifications.filter(notification => {
      // Type filter
      const typeMatch = filterType === 'all' || notification.notification_type === filterType
      
      // Search filter
      const searchMatch = searchTerm === '' || 
        notification.departure_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.destination_location.toLowerCase().includes(searchTerm.toLowerCase())
      
      return typeMatch && searchMatch
    })

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'expiry-asc':
          if (!a.expires_at && !b.expires_at) return 0
          if (!a.expires_at) return 1
          if (!b.expires_at) return -1
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
        case 'expiry-desc':
          if (!a.expires_at && !b.expires_at) return 0
          if (!a.expires_at) return -1
          if (!b.expires_at) return 1
          return new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime()
        default:
          return 0
      }
    })

    return filtered
  }

  const getStats = () => {
    const total = notifications.length
    const active = notifications.filter(n => n.is_active).length
    const passengerRequests = notifications.filter(n => n.notification_type === 'passenger_request').length
    const driverPosts = notifications.filter(n => n.notification_type === 'driver_post').length
    const expiringSoon = notifications.filter(n => {
      if (!n.expires_at) return false
      const hoursUntilExpiry = (new Date(n.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60)
      return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0
    }).length

    return { total, active, passengerRequests, driverPosts, expiringSoon }
  }

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading notifications..." />
      </div>
    )
  }

  const filteredNotifications = filteredAndSortedNotifications()
  const stats = getStats()

  return (
    <div>
      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => {
            clearError()
            fetchNotifications()
          }}
          onDismiss={clearError}
          className="mb-6"
        />
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Bell size={24} className="text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Notification Management</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <span className="text-gray-600">{filteredNotifications.length} of {notifications.length} notifications</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.passengerRequests}</div>
          <div className="text-sm text-gray-600">Passenger Alerts</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.driverPosts}</div>
          <div className="text-sm text-gray-600">Driver Alerts</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
          <div className="text-sm text-gray-600">Expiring Soon</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">Filter & Search</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Filter size={16} />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by departure or destination location..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="passenger_request">Passenger Request Alerts</option>
                  <option value="driver_post">Driver Post Alerts</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="expiry-asc">Expiring Soon</option>
                  <option value="expiry-desc">Expiring Last</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {notifications.length === 0 ? 'No Notifications Set Up' : 'No Matching Notifications'}
          </h3>
          <p className="text-gray-600">
            {notifications.length === 0 
              ? 'You haven\'t set up any ride notifications yet. Create notifications when posting rides or requesting rides.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const expiryStatus = getExpiryStatus(notification)
            
            return (
              <div
                key={notification.id}
                className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bell size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getNotificationTypeLabel(notification.notification_type)}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Created {formatDateTime(notification.created_at)}</span>
                        <span className={expiryStatus.color}>{expiryStatus.text}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getNotificationTypeColor(notification.notification_type)}`}>
                      <span>{notification.notification_type === 'passenger_request' ? '🚗' : '📢'}</span>
                      <span>{notification.notification_type === 'passenger_request' ? 'Request Alert' : 'Post Alert'}</span>
                    </div>
                    
                    {notification.is_active ? (
                      <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        <CheckCircle size={14} />
                        <span>Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                        <X size={14} />
                        <span>Inactive</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notification Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Route</p>
                      <div className="font-medium text-gray-900 flex items-center">
                        <MapPin size={14} className="mr-1 text-gray-400" />
                        {notification.departure_location} → {notification.destination_location}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Date Preference</p>
                      <div className="font-medium text-gray-900 flex items-center">
                        <Calendar size={14} className="mr-1 text-gray-400" />
                        {getDateTypeDisplay(notification)}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Search Radius</p>
                      <div className="font-medium text-gray-900">
                        {notification.search_radius_miles} miles
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {notification.date_type === 'multiple_dates' && notification.multiple_dates && notification.multiple_dates.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">Selected Dates:</p>
                      <div className="flex flex-wrap gap-2">
                        {notification.multiple_dates.map((date, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {formatDate(date)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {notification.expires_at && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-gray-600">Expires:</span>
                        <span className={`font-medium ${expiryStatus.color}`}>
                          {formatDateTime(notification.expires_at)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    ID: {notification.id.slice(0, 8)}...
                  </div>
                  
                  <button
                    onClick={() => setShowDeleteModal({ show: true, notification })}
                    disabled={deletingId === notification.id}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    {deletingId === notification.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Information Panel */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4">📋 About Ride Notifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">🚗 Passenger Request Alerts</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Get notified when drivers post rides matching your route</li>
              <li>• Set up when requesting a ride</li>
              <li>• Automatically expire after your selected date/month</li>
              <li>• Can be deleted anytime to stop notifications</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">📢 Driver Post Alerts</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Get notified when passengers request rides in your area</li>
              <li>• Set up when posting a ride</li>
              <li>• Choose specific dates or entire months</li>
              <li>• Manage search radius for better targeting</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>💡 Pro Tip:</strong> Notifications automatically expire based on your selected dates to keep your alerts relevant. 
            You can delete any notification at any time to stop receiving alerts.
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal.show && showDeleteModal.notification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Notification</h2>
              <p className="text-gray-600">
                Are you sure you want to delete this notification?
              </p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Notification Details:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Type:</strong> {getNotificationTypeLabel(showDeleteModal.notification.notification_type)}</p>
                <p><strong>Route:</strong> {showDeleteModal.notification.departure_location} → {showDeleteModal.notification.destination_location}</p>
                <p><strong>Date:</strong> {getDateTypeDisplay(showDeleteModal.notification)}</p>
                <p><strong>Radius:</strong> {showDeleteModal.notification.search_radius_miles} miles</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">What happens:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• You will stop receiving notifications for this route</li>
                    <li>• This action cannot be undone</li>
                    <li>• You can create a new notification anytime</li>
                    <li>• Other notifications will not be affected</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal({ show: false, notification: null })}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNotification(showDeleteModal.notification!.id)}
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Deleting...' : 'Delete Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}