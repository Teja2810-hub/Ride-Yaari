import React, { useState, useEffect } from 'react'
import { Bell, Trash2, Clock, Search, ListFilter as Filter, RefreshCw, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, X, CreditCard as Edit, Car, Plane, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideNotification, TripNotification } from '../types'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import { formatDateWithWeekday } from '../utils/dateHelpers'
import NotificationEditModal from './NotificationEditModal'

interface NotificationManagementProps {
  onBack?: () => void
}

type FilterType = 'all' | 'rides' | 'trips' | 'passenger_request' | 'driver_post' | 'passenger_trip_request' | 'traveler_post'
type SortOption = 'date-desc' | 'date-asc' | 'expiry-asc' | 'expiry-desc'

type NotificationItem = (RideNotification & { type: 'ride' }) | (TripNotification & { type: 'trip' })

export default function NotificationManagement({ onBack }: NotificationManagementProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [rideNotifications, setRideNotifications] = useState<RideNotification[]>([])
  const [tripNotifications, setTripNotifications] = useState<TripNotification[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [showFilters, setShowFilters] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState<{
    show: boolean
    notification: NotificationItem | null
  }>({ show: false, notification: null })
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingNotification, setEditingNotification] = useState<NotificationItem | null>(null)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      
      // Listen for refresh events from other components
      const handleRefresh = () => {
        console.log('NotificationManagement: Received refresh event')
        fetchNotifications()
      }
      
      window.addEventListener('refreshNotifications', handleRefresh)
      
      // Also listen for ride posting events
      const handleRidePosted = () => {
        console.log('NotificationManagement: Ride posted, refreshing notifications')
        setTimeout(() => {
          fetchNotifications()
        }, 2000) // Wait 2 seconds for database consistency
      }
      
      window.addEventListener('ridePosted', handleRidePosted)
      
      return () => {
        window.removeEventListener('refreshNotifications', handleRefresh)
        window.removeEventListener('ridePosted', handleRidePosted)
      }
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    await handleAsync(async () => {
      // Fetch ride notifications
      const { data: rideData, error: rideError } = await supabase
        .from('ride_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (rideError) {
        console.error('NotificationManagement: Error fetching ride notifications:', rideError)
        throw rideError
      }

      // Fetch trip notifications
      const { data: tripData, error: tripError } = await supabase
        .from('trip_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (tripError) {
        console.error('NotificationManagement: Error fetching trip notifications:', tripError)
        throw tripError
      }

      setRideNotifications(rideData || [])
      setTripNotifications(tripData || [])
    })
  }

  const handleDeleteNotification = async (notificationId: string, notificationType: 'ride' | 'trip') => {
    if (!user) return

    setShowDeleteModal({ show: false, notification: null })
    setDeletingId(notificationId)

    await handleAsync(async () => {
      const tableName = notificationType === 'ride' ? 'ride_notifications' : 'trip_notifications'
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      // Remove from local state
      if (notificationType === 'ride') {
        setRideNotifications(prev => prev.filter(n => n.id !== notificationId))
      } else {
        setTripNotifications(prev => prev.filter(n => n.id !== notificationId))
      }
      
      setSuccessMessage('Notification deleted successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    })
    
    setDeletingId(null)
  }

  const handleEditNotification = (notification: NotificationItem) => {
    setEditingNotification(notification)
    setShowEditModal(true)
  }

  const toggleNotificationExpansion = (notificationId: string) => {
    setExpandedNotification(expandedNotification === notificationId ? null : notificationId)
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

  const getExpiryStatus = (notification: RideNotification | TripNotification) => {
    if (!notification.expires_at) return { status: 'no-expiry', text: 'Active', color: 'text-green-600', isExpired: false }

    const expiryDate = new Date(notification.expires_at)
    const now = new Date()

    if (expiryDate <= now) {
      return { status: 'expired', text: 'Expired', color: 'text-red-600', isExpired: true }
    }

    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilExpiry <= 24) {
      return { status: 'expiring-soon', text: `Expires in ${Math.ceil(hoursUntilExpiry)}h`, color: 'text-orange-600', isExpired: false }
    }

    const daysUntilExpiry = Math.ceil(hoursUntilExpiry / 24)
    return { status: 'active', text: `Expires in ${daysUntilExpiry}d`, color: 'text-green-600', isExpired: false }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'passenger_request':
        return 'Passenger Request Alert'
      case 'driver_post':
        return 'Driver Post Alert'
      case 'passenger_trip_request':
        return 'Trip Request Alert'
      case 'traveler_post':
        return 'Traveler Post Alert'
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
      case 'passenger_trip_request':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'traveler_post':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDateTypeDisplay = (notification: NotificationItem) => {
    switch (notification.date_type) {
      case 'specific_date':
        return notification.specific_date ? `📅 ${formatDateWithWeekday(notification.specific_date)}` : 'Specific date'
      case 'multiple_dates':
        return notification.multiple_dates && notification.multiple_dates.length > 0
          ? `📅 ${notification.multiple_dates.length} selected dates`
          : 'Multiple dates'
      case 'month':
        return (notification as RideNotification).notification_month ? `📅 ${(notification as RideNotification).notification_month}` : 'Month'
      default:
        return 'Unknown'
    }
  }

  const getLocationDisplay = (notification: NotificationItem) => {
    if ('departure_location' in notification) {
      // Ride notification
      return `${notification.departure_location} → ${notification.destination_location}`
    } else {
      // Trip notification
      return `${(notification as TripNotification).departure_airport} → ${(notification as TripNotification).destination_airport}`
    }
  }

  const getAllNotifications = (): NotificationItem[] => {
    const rideItems: NotificationItem[] = rideNotifications.map(n => ({ ...n, type: 'ride' as const }))
    const tripItems: NotificationItem[] = tripNotifications.map(n => ({ ...n, type: 'trip' as const }))
    return [...rideItems, ...tripItems]
  }

  const filteredAndSortedNotifications = () => {
    const allNotifications = getAllNotifications()
    
    let filtered = allNotifications.filter(notification => {
      // Type filter
      if (filterType === 'all') {
        return true
      } else if (filterType === 'rides') {
        return notification.type === 'ride'
      } else if (filterType === 'trips') {
        return notification.type === 'trip'
      } else {
        return (notification as RideNotification).notification_type === filterType || 
               (notification as TripNotification).notification_type === filterType
      }
    })
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(notification => 
        getLocationDisplay(notification).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

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
    const allNotifications = getAllNotifications()
    const total = allNotifications.length
    const active = allNotifications.filter(n => n.is_active).length
    const rideNotifs = rideNotifications.length
    const tripNotifs = tripNotifications.length
    const expiringSoon = allNotifications.filter(n => {
      if (!n.expires_at) return false
      const hoursUntilExpiry = (new Date(n.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60)
      return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0
    }).length

    return { total, active, rideNotifs, tripNotifs, expiringSoon }
  }

  if (isLoading && rideNotifications.length === 0 && tripNotifications.length === 0) {
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
      <div className="flex items-center justify-between mb-6 gap-2">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Notification Management</h2>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <span className="text-gray-600 text-sm sm:text-base whitespace-nowrap">{filteredNotifications.length} of {stats.total} notifications</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.rideNotifs}</div>
          <div className="text-sm text-gray-600">Car Rides</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.tripNotifs}</div>
          <div className="text-sm text-gray-600">Airport Trips</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{rideNotifications.filter(n => n.notification_type === 'passenger_request').length}</div>
          <div className="text-sm text-gray-600">Passenger Alerts</div>
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
                  <option value="rides">Car Ride Alerts</option>
                  <option value="trips">Airport Trip Alerts</option>
                  <option value="passenger_request">Car Passenger Alerts</option>
                  <option value="driver_post">Car Driver Alerts</option>
                  <option value="passenger_trip_request">Trip Passenger Alerts</option>
                  <option value="traveler_post">Traveler Post Alerts</option>
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
            {stats.total === 0 ? 'No Notifications Set Up' : 'No Matching Notifications'}
          </h3>
          <p className="text-gray-600">
            {stats.total === 0 
              ? 'You haven\'t set up any ride notifications yet. Create notifications when posting rides or requesting rides.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const expiryStatus = getExpiryStatus(notification)
            const isExpanded = expandedNotification === notification.id
            
            return (
              <div
                key={notification.id}
                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header - Always Visible */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleNotificationExpansion(notification.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        {notification.type === 'ride' ? (
                          <Car size={24} className="text-green-600" />
                        ) : (
                          <Plane size={24} className="text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                          {getLocationDisplay(notification)}
                        </h3>
                        <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                          <span>{getDateTypeDisplay(notification)}</span>
                          <span className={expiryStatus.color}>{expiryStatus.text}</span>
                        </div>
                      </div>
                    </div>

                    {/* STACKED type + status (no pointer events so header remains clickable) */}
                    <div className="flex flex-col items-end space-y-2 pointer-events-none select-none">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${getNotificationTypeColor((notification as RideNotification).notification_type || (notification as TripNotification).notification_type)}`}>
                        <span>{notification.type === 'ride' ? '🚗' : '✈️'}</span>
                        <span>{notification.type === 'ride' ? 'Car Ride' : 'Airport Trip'}</span>
                      </div>

                      {expiryStatus.isExpired ? (
                        <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                          <X size={14} />
                          <span>Expired</span>
                        </div>
                      ) : notification.is_active ? (
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
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6 space-y-6">
                      {/* Notification Details */}
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Notification Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 mb-1">Type</p>
                            <div className="font-medium text-gray-900">
                              {getNotificationTypeLabel((notification as RideNotification).notification_type || (notification as TripNotification).notification_type)}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Created</p>
                            <div className="font-medium text-gray-900">
                              {formatDateTime(notification.created_at)}
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-1">Status</p>
                            <div className={`font-medium ${expiryStatus.color}`}>
                              {expiryStatus.text}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details */}
                      {notification.date_type === 'multiple_dates' && notification.multiple_dates && notification.multiple_dates.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-2">Selected Dates:</p>
                          <div className="flex flex-wrap gap-2">
                            {notification.multiple_dates.map((date, index) => (
                              <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {formatDateWithWeekday(date)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {notification.expires_at && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock size={14} className="text-gray-400" />
                            <span className="text-gray-600">Expires:</span>
                            <span className={`font-medium ${expiryStatus.color}`}>
                              {formatDateTime(notification.expires_at)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          ID: {notification.id.slice(0, 8)}...
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {expiryStatus.status !== 'expired' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditNotification(notification)
                              }}
                              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                            >
                              <Edit size={16} />
                              <span>Edit</span>
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDeleteModal({ show: true, notification })
                            }}
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
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Information Panel */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4">📋 About Travel Notifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">🚗 Car Ride Alerts</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Get notified when drivers post rides matching your route</li>
              <li>• Get notified when passengers request rides in your area</li>
              <li>• Automatically expire after your selected date/month</li>
              <li>• Can be deleted anytime to stop notifications</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">✈️ Airport Trip Alerts</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Get notified when travelers post trips matching your route</li>
              <li>• Get notified when passengers request trip assistance</li>
              <li>• Choose specific dates or entire months</li>
              <li>• Airport-to-airport matching for precise results</li>
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
                <p><strong>Type:</strong> {getNotificationTypeLabel((showDeleteModal.notification as RideNotification).notification_type || (showDeleteModal.notification as TripNotification).notification_type)}</p>
                <p><strong>Route:</strong> {getLocationDisplay(showDeleteModal.notification)}</p>
                <p><strong>Date:</strong> {getDateTypeDisplay(showDeleteModal.notification)}</p>
                {showDeleteModal.notification.type === 'ride' && (
                  <p><strong>Radius:</strong> {(showDeleteModal.notification as RideNotification).search_radius_miles} miles</p>
                )}
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
                onClick={() => handleDeleteNotification(showDeleteModal.notification!.id, showDeleteModal.notification!.type)}
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Deleting...' : 'Delete Notification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <NotificationEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingNotification(null)
        }}
        notification={editingNotification}
        onUpdate={() => {
          setShowEditModal(false)
          setEditingNotification(null)
          fetchNotifications()
        }}
      />
    </div>
  )
}