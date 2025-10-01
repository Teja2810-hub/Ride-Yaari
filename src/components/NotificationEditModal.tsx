import React, { useState, useEffect } from 'react'
import { X, Calendar, MapPin, Save, TriangleAlert as AlertTriangle } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { RideNotification, TripNotification } from '../types'
import { formatDateWithWeekday } from '../utils/dateHelpers'

interface NotificationEditModalProps {
  isOpen: boolean
  onClose: () => void
  notification: RideNotification | TripNotification | null
  onUpdate: () => void
}

export default function NotificationEditModal({
  isOpen,
  onClose,
  notification,
  onUpdate
}: NotificationEditModalProps) {
  const [dateType, setDateType] = useState<'specific_date' | 'multiple_dates' | 'month'>('specific_date')
  const [specificDate, setSpecificDate] = useState('')
  const [multipleDates, setMultipleDates] = useState<string[]>([''])
  const [notificationMonth, setNotificationMonth] = useState('')
  const [searchRadius, setSearchRadius] = useState(25)
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (notification) {
      setDateType(notification.date_type)
      setSpecificDate(notification.specific_date || '')
      setMultipleDates(notification.multiple_dates || [''])
      setNotificationMonth((notification as RideNotification).notification_month || '')
      setSearchRadius((notification as RideNotification).search_radius_miles || 25)
      setIsActive(notification.is_active)
    }
  }, [notification])

  const handleSave = async () => {
    if (!notification) return

    setLoading(true)
    setError('')

    try {
      // Calculate new expiry date
      let expiresAt: string | null = null

      if (dateType === 'specific_date' && specificDate) {
        const expiry = new Date(specificDate)
        expiry.setHours(23, 59, 59, 999)
        expiresAt = expiry.toISOString()
      } else if (dateType === 'multiple_dates' && multipleDates.length > 0) {
        const latestDate = multipleDates.filter(d => d).sort().pop()
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

      const tableName = 'type' in notification && notification.type === 'trip' ? 'trip_notifications' : 'ride_notifications'

      const updateData: any = {
        date_type: dateType,
        specific_date: dateType === 'specific_date' ? specificDate : null,
        multiple_dates: dateType === 'multiple_dates' ? multipleDates.filter(d => d) : null,
        is_active: isActive,
        expires_at: expiresAt
      }

      if (tableName === 'ride_notifications') {
        updateData.notification_month = dateType === 'month' ? notificationMonth : null
        updateData.search_radius_miles = searchRadius
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', notification.id)

      if (updateError) throw updateError

      onUpdate()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update notification')
    } finally {
      setLoading(false)
    }
  }

  const addDate = () => {
    setMultipleDates([...multipleDates, ''])
  }

  const removeDate = (index: number) => {
    setMultipleDates(multipleDates.filter((_, i) => i !== index))
  }

  const updateDate = (index: number, value: string) => {
    const newDates = [...multipleDates]
    newDates[index] = value
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

  if (!isOpen || !notification) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Notification</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Route Info (Read-only) */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Route</h3>
            <div className="flex items-center text-gray-700">
              <MapPin size={16} className="mr-2" />
              {'departure_location' in notification
                ? `${notification.departure_location} → ${notification.destination_location}`
                : `${(notification as TripNotification).departure_airport} → ${(notification as TripNotification).destination_airport}`
              }
            </div>
            <p className="text-xs text-gray-500 mt-2">Route cannot be changed. Delete and create a new notification to change the route.</p>
          </div>

          {/* Date Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Date Type
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dateType"
                  checked={dateType === 'specific_date'}
                  onChange={() => setDateType('specific_date')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Specific Date</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dateType"
                  checked={dateType === 'multiple_dates'}
                  onChange={() => setDateType('multiple_dates')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Multiple Dates</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dateType"
                  checked={dateType === 'month'}
                  onChange={() => setDateType('month')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Entire Month</span>
              </label>
            </div>
          </div>

          {/* Date Inputs */}
          {dateType === 'specific_date' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specific Date
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
            </div>
          )}

          {dateType === 'multiple_dates' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Multiple Dates
              </label>
              <div className="space-y-2">
                {multipleDates.map((date, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => updateDate(index, e.target.value)}
                        min={getTomorrowDate()}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                    {multipleDates.length > 1 && (
                      <button
                        onClick={() => removeDate(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                ))}
                {multipleDates.length < 10 && (
                  <button
                    onClick={addDate}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Another Date
                  </button>
                )}
              </div>
            </div>
          )}

          {dateType === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
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
            </div>
          )}

          {/* Search Radius (only for ride notifications) */}
          {'departure_location' in notification && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Radius (miles)
              </label>
              <input
                type="number"
                value={searchRadius}
                onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                min={5}
                max={100}
                step={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">Set how far to search for matching rides (5-100 miles)</p>
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Keep notification active
            </label>
          </div>

          {!isActive && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  Inactive notifications will not send you alerts. You can reactivate it anytime by editing again.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 mt-8">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
