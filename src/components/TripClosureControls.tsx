import React, { useState } from 'react'
import { Lock, Clock as Unlock, TriangleAlert as AlertTriangle, X, Calendar, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { closeTrip, closeRide, reopenTrip, reopenRide } from '../utils/tripClosureHelpers'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { CarRide, Trip } from '../types'
import ErrorMessage from './ErrorMessage'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface TripClosureControlsProps {
  ride?: CarRide
  trip?: Trip
  onUpdate?: () => void
}

export default function TripClosureControls({ ride, trip, onUpdate }: TripClosureControlsProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [closeReason, setCloseReason] = useState('')

  const isOwner = (ride && ride.user_id === user?.id) || (trip && trip.user_id === user?.id)
  const isClosed = (ride && ride.is_closed) || (trip && trip.is_closed)
  const isPast = ride 
    ? new Date(ride.departure_date_time) <= new Date()
    : trip 
      ? new Date(trip.travel_date) <= new Date()
      : false

  const handleClose = async () => {
    if (!user) return

    await handleAsync(async () => {
      let result
      if (ride) {
        result = await closeRide(ride.id, user.id, closeReason.trim() || undefined)
      } else if (trip) {
        result = await closeTrip(trip.id, user.id, closeReason.trim() || undefined)
      } else {
        throw new Error('No ride or trip to close')
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to close')
      }

      setShowCloseModal(false)
      setCloseReason('')
      if (onUpdate) onUpdate()
    })
  }

  const handleReopen = async () => {
    if (!user) return

    console.log('Attempting to reopen:', { ride: ride?.id, trip: trip?.id, userId: user.id })

    await handleAsync(async () => {
      let result
      if (ride) {
        console.log('Reopening ride:', ride.id)
        result = await reopenRide(ride.id, user.id)
      } else if (trip) {
        console.log('Reopening trip:', trip.id)
        result = await reopenTrip(trip.id, user.id)
      } else {
        throw new Error('No ride or trip to reopen')
      }
      
      console.log('Reopen operation result:', result)
      if (!result.success) {
        throw new Error(result.error || 'Failed to reopen')
      }

      console.log('Reopen successful, calling onUpdate')
      setShowReopenModal(false)
      if (onUpdate) onUpdate()
    })
  }


  if (!isOwner) return null

  return (
    <>
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={clearError}
          className="mb-4"
        />
      )}

      <div className="flex items-center space-x-3">
        {isClosed ? (
          <>
            <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              <Lock size={14} />
              <span>Closed</span>
            </div>
            {!isPast && (
              <button
                onClick={() => setShowReopenModal(true)}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
              >
                <Unlock size={14} />
                <span>Reopen</span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => setShowCloseModal(true)}
            disabled={isLoading || isPast}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
          >
            <Lock size={14} />
            <span>Close {ride ? 'Ride' : 'Trip'}</span>
          </button>
        )}
      </div>

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Lock size={20} className="text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Close {ride ? 'Ride' : 'Trip'}</h2>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Trip/Ride Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                {ride ? (
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">🚗</span>
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">✈️</span>
                  </div>
                )}
                <h3 className="font-semibold text-gray-900">
                  {ride ? 'Car Ride' : 'Airport Trip'}
                </h3>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Route:</strong> {
                  ride 
                    ? `${ride.from_location} → ${ride.to_location}`
                    : `${trip?.leaving_airport} → ${trip?.destination_airport}`
                }</p>
                <p><strong>Timing:</strong> {
                  ride 
                    ? formatDateTimeSafe(ride.departure_date_time)
                    : formatDateSafe(trip?.travel_date || '')
                }</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">What happens when you close:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• No new passengers can request to join</li>
                      <li>• All pending requests will be automatically rejected</li>
                      <li>• The {ride ? 'ride' : 'trip'} won't appear in search results</li>
                      <li>• Existing confirmed passengers are not affected</li>
                      <li>• You can reopen it later if needed</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Closing (Optional)
                </label>
                <textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Why are you closing this ride/trip? (for your reference)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors resize-none"
                  rows={3}
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {closeReason.length}/200 characters
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Closing...' : `Close ${ride ? 'Ride' : 'Trip'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Unlock size={20} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Reopen {ride ? 'Ride' : 'Trip'}</h2>
              </div>
              <button
                onClick={() => setShowReopenModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to reopen this {ride ? 'ride' : 'trip'}?
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Unlock size={16} className="text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">What happens when you reopen:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• The {ride ? 'ride' : 'trip'} will appear in search results again</li>
                      <li>• New passengers can request to join</li>
                      <li>• You'll receive new confirmation requests</li>
                      <li>• Existing confirmed passengers remain confirmed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowReopenModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReopen}
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Reopening...' : `Reopen ${ride ? 'Ride' : 'Trip'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}