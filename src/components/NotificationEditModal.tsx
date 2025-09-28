import React, { useState, useEffect } from 'react'
import { CreditCard as Edit, X, MapPin, Calendar, Clock, Search, Plus, Save } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideNotification } from '../types'
import LocationAutocomplete from './LocationAutocomplete'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface LocationData {
  address: string
  latitude: number | null
  longitude: number | null
}

interface NotificationEditModalProps {
  isOpen: boolean
  onClose: () => void
  notification: RideNotification | null
  onUpdate: () => void
}

export default function NotificationEditModal({ 
  isOpen, 
  onClose, 
  notification, 
  onUpdate 
}: NotificationEditModalProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [departureLocation, setDepartureLocation] = useState<LocationData | null>(null)
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null)
  const [searchRadius, setSearchRadius] = useState(25)
  const [dateType, setDateType] = useState<'specific_date' | 'multiple_dates' | 'month'>('specific_date')
  const [specificDate, setSpecificDate] = useState('')
  const [multipleDates, setMultipleDates] = useState<string[]>([''])
  const [notificationMonth, setNotificationMonth] = useState('')

  useEffect(() => {
    if (notification && isOpen) {
      // Initialize form with notification data
      setDepartureLocation({
        address: notification.departure_location,
        latitude: notification.departure_latitude,
        longitude: notification.departure_longitude
      })
      
      setDestinationLocation({
        address: notification.destination_location,
        latitude: notification.destination_latitude,
        longitude: notification.destination_longitude
      })
      
      setSearchRadius(notification.search_radius_miles)
      setDateType(notification.date_type)
      
      if (notification.date_type === 'specific_date' && notification.specific_date) {
        setSpecificDate(notification.specific_date)
      } else if (notification.date_type === 'multiple_dates' && notification.multiple_dates) {
        setMultipleDates(notification.multiple_dates.length > 0 ? notification.multiple_dates : [''])
      } else if (notification.date_type === 'month' && notification.notification_month) {
        setNotificationMonth(notification.notification_month)
      }
    }
  }, [notification, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !notification || !departureLocation || !destinationLocation) return

    await handleAsync(async () => {
      // Calculate new expiry date based on updated preferences
      let expiresAt: string | null = null
      
      if (dateType === 'specific_date' && specificDate) {
        const expiry = new Date(specificDate)
        expiry.setHours(23, 59, 59, 999)
        expiresAt = expiry.toISOString()
      } else if (dateType === 'multiple_dates' && multipleDates.some(d => d)) {
        const validDates = multipleDates.filter(d => d)
        const latestDate = validDates.sort().pop()
        if (latestDate) {
          const expiry = new Date(latestDate)
          expiry.setHours(23, 59, 59, 999)
          expiresAt = expiry.toISOString()
        }
      } else if (dateType === 'month' && notificationMonth) {
        const [year, month] = notificationMonth.split('-')
        const expiry = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)
        expiresAt = expiry.toISOString()
      }

      const { error } = await supabase
        .from('ride_notifications')
        .update({
          departure_location: departureLocation.address,
          departure_latitude: departureLocation.latitude,
          departure_longitude: departureLocation.longitude,
          destination_location: destinationLocation.address,
          destination_latitude: destinationLocation.latitude,
          destination_longitude: destinationLocation.longitude,
          search_radius_miles: searchRadius,
          date_type: dateType,
          specific_date: dateType === 'specific_date' ? specificDate : null,
          multiple_dates: dateType === 'multiple_dates' ? multipleDates.filter(d => d) : null,
          notification_month: dateType === 'month' ? notificationMonth : null,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', notification.id)
        .eq('user_id', user.id)

      if (error) throw error

      onUpdate()
      onClose()
    })
  }

  const addMultipleDate = () => {
    if (multipleDates.length < 5) {
      setMultipleDates([...multipleDates, ''])
    }
  }

  const removeMultipleDate = (index: number) => {
    setMultipleDates(multipleDates.filter((_, i) => i !== index))
  }

  const updateMultipleDate = (index: number, date: string) => {
    const newDates = [...multipleDates]
    newDates[index] = date
    setMultipleDates(newDates)
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getTodayMonth = () => {
    return new Date().toISOString().slice(0, 7)
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'passenger_request':
        return 'Passenger Request Alert'
      case 'driver_post':
        return 'Driver Post Alert'
      default:
        return 'Notification'
    }
  }

  if (!isOpen || !notification) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Edit size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Edit Notification</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={clearError}
              className="mb-6"
            />
          )}

          {isLoading && (
            <div className="mb-6">
              <LoadingSpinner text="Updating notification..." />
            </div>
          )}

          {/* Notification Type Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Editing: {getNotificationTypeLabel(notification.notification_type)}
            </h3>
            <p className="text-sm text-blue-800">
              {notification.notification_type === 'passenger_request' 
                ? 'You\'ll be notified when drivers post rides matching this route and timing.'
                : 'You\'ll be notified when passengers request rides in this area and timing.'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Fields */}
            <LocationAutocomplete
              value={departureLocation}
              onChange={setDepartureLocation}
              placeholder="Enter departure location..."
              label="Departure Location"
              required
            />

            <LocationAutocomplete
              value={destinationLocation}
              onChange={setDestinationLocation}
              placeholder="Enter destination location..."
              label="Destination Location"
              required
            />

            {/* Search Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Radius
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <select
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value={5}>5 miles</option>
                  <option value={10}>10 miles</option>
                  <option value={15}>15 miles</option>
                  <option value={25}>25 miles (Recommended)</option>
                  <option value={50}>50 miles</option>
                  <option value={100}>100 miles</option>
                </select>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {notification.notification_type === 'passenger_request' 
                  ? 'Drivers within this radius will be checked for matching rides'
                  : 'Passengers within this radius will be notified of your rides'
                }
              </p>
            </div>

            {/* Date Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Notification Timing
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dateType"
                    value="specific_date"
                    checked={dateType === 'specific_date'}
                    onChange={(e) => setDateType(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Specific Date</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dateType"
                    value="multiple_dates"
                    checked={dateType === 'multiple_dates'}
                    onChange={(e) => setDateType(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Multiple Dates</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dateType"
                    value="month"
                    checked={dateType === 'month'}
                    onChange={(e) => setDateType(e.target.value as any)}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">Entire Month</span>
                </label>
              </div>
            </div>

            {/* Date Selection Based on Type */}
            {dateType === 'specific_date' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    min={getTomorrowDate()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  You'll receive notifications for this specific date
                </p>
              </div>
            )}

            {dateType === 'multiple_dates' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Notification Dates <span className="text-red-500">*</span>
                  </label>
                  {multipleDates.length < 5 && (
                    <button
                      type="button"
                      onClick={addMultipleDate}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Plus size={16} />
                      <span>Add Date</span>
                    </button>
                  )}
                </div>
                
                {multipleDates.map((date, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-3">
                    <div className="flex-1 relative">
                      <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => updateMultipleDate(index, e.target.value)}
                        min={getTomorrowDate()}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        required={index === 0}
                      />
                    </div>
                    {multipleDates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMultipleDate(index)}
                        className="flex items-center justify-center w-10 h-10 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <p className="text-sm text-gray-500 mt-1">
                  You'll receive notifications for any of these dates
                </p>
              </div>
            )}

            {dateType === 'month' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Month <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="month"
                    value={notificationMonth}
                    onChange={(e) => setNotificationMonth(e.target.value)}
                    min={getTodayMonth()}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  You'll receive notifications for the entire month
                </p>
              </div>
            )}

            {/* Current vs New Comparison */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-3">📋 What's Changing</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium text-yellow-900 mb-2">Current Settings:</h5>
                  <ul className="text-yellow-800 space-y-1">
                    <li>• Route: {notification.departure_location} → {notification.destination_location}</li>
                    <li>• Radius: {notification.search_radius_miles} miles</li>
                    <li>• Date: {notification.date_type === 'specific_date' && notification.specific_date 
                      ? new Date(notification.specific_date).toLocaleDateString()
                      : notification.date_type === 'month' && notification.notification_month
                        ? notification.notification_month
                        : notification.date_type === 'multiple_dates' && notification.multiple_dates
                          ? `${notification.multiple_dates.length} dates`
                          : 'Not set'
                    }</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-yellow-900 mb-2">New Settings:</h5>
                  <ul className="text-yellow-800 space-y-1">
                    <li>• Route: {departureLocation?.address || 'Not set'} → {destinationLocation?.address || 'Not set'}</li>
                    <li>• Radius: {searchRadius} miles</li>
                    <li>• Date: {dateType === 'specific_date' && specificDate 
                      ? new Date(specificDate).toLocaleDateString()
                      : dateType === 'month' && notificationMonth
                        ? notificationMonth
                        : dateType === 'multiple_dates' && multipleDates.some(d => d)
                          ? `${multipleDates.filter(d => d).length} dates`
                          : 'Not set'
                    }</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !departureLocation || !destinationLocation || 
                         (dateType === 'specific_date' && !specificDate) ||
                         (dateType === 'multiple_dates' && !multipleDates.some(d => d)) ||
                         (dateType === 'month' && !notificationMonth)}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Save size={16} />
                    <span>Update Notification</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}