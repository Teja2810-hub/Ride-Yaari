import React, { useState } from 'react'
import { ArrowLeft, Calendar, Clock, DollarSign, Send, Bell, Search, User, Plane, Plus, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import AirportAutocomplete from './AirportAutocomplete'
import { currencies, getCurrencySymbol } from '../utils/currencies'
import { createTripRequest, createTripNotification } from '../utils/tripRequestHelpers'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface RequestTripProps {
  onBack: () => void
  isGuest?: boolean
}

type RequestType = 'specific_date' | 'multiple_dates' | 'month'

export default function RequestTrip({ onBack, isGuest = false }: RequestTripProps) {
  const { user, setGuestMode } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [departureAirport, setDepartureAirport] = useState('')
  const [destinationAirport, setDestinationAirport] = useState('')
  const [requestType, setRequestType] = useState<RequestType>('specific_date')
  const [specificDate, setSpecificDate] = useState('')
  const [multipleDates, setMultipleDates] = useState<string[]>([''])
  const [requestMonth, setRequestMonth] = useState('')
  const [departureTimePreference, setDepartureTimePreference] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
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

    if (!user || !departureAirport || !destinationAirport) return

    await handleAsync(async () => {
      // Create the trip request
      const requestData = {
        passenger_id: user.id,
        departure_airport: departureAirport,
        destination_airport: destinationAirport,
        request_type: requestType,
        specific_date: requestType === 'specific_date' ? specificDate : undefined,
        multiple_dates: requestType === 'multiple_dates' ? multipleDates.filter(d => d) : undefined,
        request_month: requestType === 'month' ? requestMonth : undefined,
        additional_notes: additionalNotes || undefined,
        is_active: true
      }

      const result = await createTripRequest(requestData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create trip request')
      }

      // Notify matching travelers about the request
      const { notifyMatchingTravelers, processTravelerNotifications } = await import('../utils/tripNotificationService')
      
      try {
        // Find and notify travelers with matching posted trips
        const matchingResult = await notifyMatchingTravelers(result.requestId!)
        console.log('Matching travelers notified:', matchingResult.notifiedTravelers)
        
        // Process traveler notification preferences
        const notificationResult = await processTravelerNotifications(result.requestId!)
        console.log('Traveler notifications processed:', notificationResult.notifiedTravelers)
      } catch (notificationError) {
        console.error('Error processing notifications:', notificationError)
        // Don't fail the request creation if notifications fail
      }

      // Create notification preference if enabled
      if (enableNotifications) {
        try {
          const notificationData = {
            user_id: user.id,
            notification_type: 'passenger_request' as const,
            departure_airport: departureAirport,
            destination_airport: destinationAirport,
            date_type: notificationDateType,
            specific_date: notificationDateType === 'specific_date' ? notificationSpecificDate : undefined,
            multiple_dates: notificationDateType === 'multiple_dates' ? notificationMultipleDates.filter(d => d) : undefined,
            notification_month: notificationDateType === 'month' ? notificationMonth : undefined,
            is_active: true
          }

          await createTripNotification(notificationData)
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Trip Request Sent!</h2>
          <p className="text-gray-600 mb-8">
            Your trip request has been sent to travelers in your area. You'll be notified when matching trips are found.
            {enableNotifications && (
              <span className="block mt-2 text-sm text-blue-600">
                ✅ Notifications enabled for future matching trips
              </span>
            )}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setSuccess(false)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Request Another Trip
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50/90 to-indigo-100/90 travel-bg p-4">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Dashboard</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a Trip</h1>
              <p className="text-gray-600">Let travelers know you need assistance on their route</p>
              {isGuest && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Browsing as Guest:</strong> You can fill out the form, but you'll need to sign up to request a trip.
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
              <AirportAutocomplete
                value={departureAirport}
                onChange={setDepartureAirport}
                placeholder="Search for departure airport..."
                label="Departure Airport"
                required
              />

              <AirportAutocomplete
                value={destinationAirport}
                onChange={setDestinationAirport}
                placeholder="Search for destination airport..."
                label="Destination Airport"
                required
              />

              {/* Request Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  When do you need the trip?
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Optional Preferences */}
              <div className="grid md:grid-cols-2 gap-6">
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Service Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400 font-medium">
                      {getCurrencySymbol(currency)}
                    </span>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="Any price"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Describe what assistance you need (package delivery, travel help, etc.)..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
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
                  <h3 className="font-semibold text-blue-900">Get Notified of Future Trips</h3>
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
                    Notify me when travelers post trips matching this route
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
                        <strong>💡 How it works:</strong> When travelers post trips matching your route and timing, 
                        you'll receive notifications. You can manage these notifications in your profile settings.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Better Results</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Be specific about what assistance you need</li>
                  <li>• Consider flexible timing for better matches</li>
                  <li>• Set a reasonable maximum service fee</li>
                  <li>• Enable notifications to catch future trips</li>
                  <li>• Mention if you need special assistance (elderly care, first-time travel, etc.)</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isLoading || !departureAirport || !destinationAirport || 
                         (requestType === 'specific_date' && !specificDate) ||
                         (requestType === 'multiple_dates' && !multipleDates.some(d => d)) ||
                         (requestType === 'month' && !requestMonth)}
                className={`w-full py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isGuest 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoading ? 'Sending Request...' : isGuest ? 'Sign Up to Request Trip' : 'Send Trip Request'}
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
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={32} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign Up to Request Trip</h2>
              <p className="text-gray-600">
                To request a trip and connect with travelers, please create an account or sign in.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowAuthPrompt(false)
                  setGuestMode(false)
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
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
    </>
  )
}