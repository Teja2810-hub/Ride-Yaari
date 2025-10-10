import React, { useState } from 'react'
import { ArrowLeft, Calendar, Clock, Send, Plus, X, Bell, Search, User, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import LocationAutocomplete from './LocationAutocomplete'
import Sidebar from './Sidebar'
// removed unused currency imports
import { createRideRequest } from '../utils/rideRequestHelpers'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface LocationData {
  address: string
  latitude: number | null
  longitude: number | null
}

interface RequestRideProps {
  onBack: () => void
  onProfile: () => void
  isGuest?: boolean
}

type RequestType = 'specific_date' | 'multiple_dates' | 'month'

export default function RequestRide({ onBack, onProfile, isGuest = false }: RequestRideProps) {
  const { user, setGuestMode, signOut } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [departureLocation, setDepartureLocation] = useState<LocationData | null>(null)
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null)
  const [requestType, setRequestType] = useState<RequestType>('specific_date')
  const [specificDate, setSpecificDate] = useState('')
  const [multipleDates, setMultipleDates] = useState<string[]>([''])
  const [requestMonth, setRequestMonth] = useState('')
  const [departureTimePreference, setDepartureTimePreference] = useState('')
  const [searchRadius, setSearchRadius] = useState(25)
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [enableNotifications, setEnableNotifications] = useState(false)
  const [notificationDateType, setNotificationDateType] = useState<'specific_date' | 'multiple_dates' | 'month'>('specific_date')
  const [notificationSpecificDate, setNotificationSpecificDate] = useState('')
  const [notificationMultipleDates, setNotificationMultipleDates] = useState<string[]>([''])
  const [notificationMonth, setNotificationMonth] = useState('')
  const [success, setSuccess] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isGuest) {
      setShowAuthPrompt(true)
      return
    }

    if (!user || !departureLocation || !destinationLocation) return

    await handleAsync(async () => {
      // Create the ride request
      const requestData = {
        passenger_id: user.id,
        departure_location: departureLocation.address,
        departure_latitude: departureLocation.latitude ?? undefined,
        departure_longitude: departureLocation.longitude ?? undefined,
        destination_location: destinationLocation.address,
        destination_latitude: destinationLocation.latitude ?? undefined,
        destination_longitude: destinationLocation.longitude ?? undefined,
        search_radius_miles: searchRadius,
        request_type: requestType,
        specific_date: requestType === 'specific_date' ? specificDate : undefined,
        multiple_dates: requestType === 'multiple_dates' ? multipleDates.filter(d => d) : undefined,
        request_month: requestType === 'month' ? requestMonth : undefined,
        currency: 'USD',
        additional_notes: additionalNotes || undefined,
        is_active: true
      }

      const result = await createRideRequest(requestData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create ride request')
      }

      // Notify matching drivers about the request
      const { notifyMatchingDrivers, processDriverNotifications } = await import('../utils/rideNotificationService')
      
      try {
        // Find and notify drivers with matching posted rides
        const matchingResult = await notifyMatchingDrivers(result.requestId!)
        console.log('Matching drivers notified:', matchingResult.notifiedDrivers)
        
        // Process driver notification preferences
        const notificationResult = await processDriverNotifications(result.requestId!)
        console.log('Driver notifications processed:', notificationResult.notifiedDrivers)
      } catch (notificationError) {
        console.error('Error processing notifications:', notificationError)
        // Don't fail the request creation if notifications fail
      }

      // Create notification preference if enabled
      if (enableNotifications) {
        const { createRideNotification } = await import('../utils/rideRequestHelpers')
        
        try {
          const notificationData = {
            user_id: user.id,
            notification_type: 'passenger_request' as const,
            departure_location: departureLocation.address,
            departure_latitude: departureLocation.latitude ?? undefined,
            departure_longitude: departureLocation.longitude ?? undefined,
            destination_location: destinationLocation.address,
            destination_latitude: destinationLocation.latitude ?? undefined,
            destination_longitude: destinationLocation.longitude ?? undefined,
            search_radius_miles: searchRadius,
            date_type: notificationDateType,
            specific_date: notificationDateType === 'specific_date' ? notificationSpecificDate : undefined,
            multiple_dates: notificationDateType === 'multiple_dates' ? notificationMultipleDates.filter(d => d) : undefined,
            notification_month: notificationDateType === 'month' ? notificationMonth : undefined,
            is_active: true
          }

          await createRideNotification(notificationData)
          console.log('Passenger notification preference created successfully')
        } catch (notificationError) {
          console.error('Error creating passenger notification:', notificationError)
          // Don't fail the request creation if notification setup fails
        }
      }

      setSuccess(true)
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

  const addNotificationDate = () => {
    if (notificationMultipleDates.length < 5) {
      setNotificationMultipleDates([...notificationMultipleDates, ''])
    }
  }

  const removeNotificationDate = (index: number) => {
    setNotificationMultipleDates(notificationMultipleDates.filter((_, i) => i !== index))
  }

  const updateNotificationDate = (index: number, date: string) => {
    const newDates = [...notificationMultipleDates]
    newDates[index] = date
    setNotificationMultipleDates(newDates)
  }

  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const getTodayMonth = () => {
    return new Date().toISOString().slice(0, 7)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ride Request Sent!</h2>
          <p className="text-gray-600 mb-8">
            Your ride request has been sent to drivers in your area. You'll be notified when matching rides are found.
            {enableNotifications && (
              <span className="block mt-2 text-sm text-blue-600">
                ✅ Notifications enabled for future matching rides
              </span>
            )}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setSuccess(false)}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Request Another Ride
            </button>
            <button
              onClick={onBack}
              className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50/90 to-emerald-100/90 travel-bg p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between gap-2 sm:gap-4 flex-nowrap">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            {isGuest ? (
              <button
                onClick={() => setGuestMode(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Sign Up / Sign In
              </button>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 text-green-600 hover:text-green-700 font-medium transition-colors rounded-xl shrink-0 whitespace-nowrap"
              >
                <Menu size={20} />
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Ride</h1>
              <p className="text-gray-600">Let drivers in your area know you need a ride</p>
              {isGuest && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Browsing as Guest:</strong> You can fill out the form, but you'll need to sign up to request a ride.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <ErrorMessage
                message={error}
                onRetry={clearError}
                onDismiss={clearError}
                className="mb-6"
              />
            )}

            {isLoading && (
              <div className="mb-6">
                <LoadingSpinner text="Sending request..." />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <LocationAutocomplete
                value={departureLocation}
                onChange={setDepartureLocation}
                placeholder="Enter departure location..."
                label="From Location"
                required
              />

              <LocationAutocomplete
                value={destinationLocation}
                onChange={setDestinationLocation}
                placeholder="Enter destination location..."
                label="To Location"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Radius
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <select
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  >
                    <option value={5}>5 miles</option>
                    <option value={10}>10 miles</option>
                    <option value={15}>15 miles</option>
                    <option value={20}>20 miles</option>
                    <option value={25}>25 miles</option>
                    <option value={30}>30 miles</option>
                    <option value={40}>40 miles</option>
                    <option value={50}>50 miles</option>
                    <option value={75}>75 miles</option>
                    <option value={100}>100 miles</option>
                  </select>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Larger radius = more potential matches
                </p>
              </div>

              {/* Request Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  When do you need the ride?
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="requestType"
                      value="specific_date"
                      checked={requestType === 'specific_date'}
                      onChange={(e) => setRequestType(e.target.value as RequestType)}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">Specific Date</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="requestType"
                      value="multiple_dates"
                      checked={requestType === 'multiple_dates'}
                      onChange={(e) => setRequestType(e.target.value as RequestType)}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">Multiple Dates</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="requestType"
                      value="month"
                      checked={requestType === 'month'}
                      onChange={(e) => setRequestType(e.target.value as RequestType)}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">Entire Month</span>
                  </label>
                </div>
              </div>

              {/* Date Selection Based on Type */}
              {requestType === 'specific_date' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      min={getTomorrowDate()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              {requestType === 'multiple_dates' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Preferred Dates <span className="text-red-500">*</span>
                    </label>
                    {multipleDates.length < 5 && (
                      <button
                        type="button"
                        onClick={addMultipleDate}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm font-medium"
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
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
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
                </div>
              )}

              {requestType === 'month' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Month <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="month"
                      value={requestMonth}
                      onChange={(e) => setRequestMonth(e.target.value)}
                      min={getTodayMonth()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Optional Preferences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time (Optional)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    value={departureTimePreference}
                    onChange={(e) => setDepartureTimePreference(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any special requirements or preferences..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none"
                  rows={3}
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {additionalNotes.length}/200 characters
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Bell size={20} className="text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Get Notified of Future Rides</h3>
                </div>
                
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="enableNotifications"
                    checked={enableNotifications}
                    onChange={(e) => setEnableNotifications(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="enableNotifications" className="text-sm font-medium text-gray-700">
                    Notify me when drivers post rides matching this route
                  </label>
                </div>

                {enableNotifications && (
                  <div className="space-y-4 bg-white rounded-lg p-4 border border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Notification timing
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="notificationDateType"
                            value="specific_date"
                            checked={notificationDateType === 'specific_date'}
                            onChange={(e) => setNotificationDateType(e.target.value as any)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Specific Date</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="notificationDateType"
                            value="multiple_dates"
                            checked={notificationDateType === 'multiple_dates'}
                            onChange={(e) => setNotificationDateType(e.target.value as any)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Multiple Dates</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="notificationDateType"
                            value="month"
                            checked={notificationDateType === 'month'}
                            onChange={(e) => setNotificationDateType(e.target.value as any)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">Entire Month</span>
                        </label>
                      </div>
                    </div>

                    {/* Notification Date Selection */}
                    {notificationDateType === 'specific_date' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notification Date
                        </label>
                        <input
                          type="date"
                          value={notificationSpecificDate}
                          onChange={(e) => setNotificationSpecificDate(e.target.value)}
                          min={getTomorrowDate()}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        />
                      </div>
                    )}

                    {notificationDateType === 'multiple_dates' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Notification Dates
                          </label>
                          {notificationMultipleDates.length < 5 && (
                            <button
                              type="button"
                              onClick={addNotificationDate}
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              <Plus size={16} />
                              <span>Add Date</span>
                            </button>
                          )}
                        </div>
                        
                        {notificationMultipleDates.map((date, index) => (
                          <div key={index} className="flex items-center space-x-2 mb-2">
                            <input
                              type="date"
                              value={date}
                              onChange={(e) => updateNotificationDate(index, e.target.value)}
                              min={getTomorrowDate()}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            />
                            {notificationMultipleDates.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeNotificationDate(index)}
                                className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {notificationDateType === 'month' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notification Month
                        </label>
                        <input
                          type="month"
                          value={notificationMonth}
                          onChange={(e) => setNotificationMonth(e.target.value)}
                          min={getTodayMonth()}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        />
                      </div>
                    )}

                    <div className="bg-blue-100 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>💡 How it works:</strong> When drivers post rides matching your route and timing, 
                        you'll receive notifications. You can manage these notifications in your profile settings.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">💡 Tips for Better Results</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Use a larger search radius (25+ miles) to find more drivers</li>
                  <li>• Be flexible with your timing for better matches</li>
                  <li>• Add specific notes about pickup preferences</li>
                  <li>• Set a reasonable maximum price</li>
                  <li>• Enable notifications to catch future rides</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isLoading || !departureLocation || !destinationLocation || 
                         (requestType === 'specific_date' && !specificDate) ||
                         (requestType === 'multiple_dates' && !multipleDates.some(d => d)) ||
                         (requestType === 'month' && !requestMonth)}
                className={`w-full py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isGuest 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isLoading ? 'Sending Request...' : isGuest ? 'Sign Up to Request Ride' : 'Send Ride Request'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign Up to Request Ride</h2>
              <p className="text-gray-600">
                To request a ride and connect with drivers, please create an account or sign in.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthPrompt(false)
                  setGuestMode(false)
                }}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Sign Up / Sign In
              </button>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {!isGuest && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onHelp={() => {
            setSidebarOpen(false)
          }}
          onProfile={() => {
            setSidebarOpen(false)
            onProfile()
          }}
          onSignOut={() => {
            setSidebarOpen(false)
            signOut()
          }}
        />
      )}
    </>
  )
}