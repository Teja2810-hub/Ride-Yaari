import React, { useState, useEffect } from 'react'
import { RefreshCw, X, Clock, TriangleAlert as AlertTriangle, Car, Plane, MessageCircle } from 'lucide-react'
import { canRequestAgain } from '../utils/confirmationHelpers'
import { RideConfirmation } from '../types'
import { formatDateTimeSafe } from '../utils/dateHelpers'

interface RequestAgainModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  confirmation: RideConfirmation
  userId: string
  loading: boolean
  onStartChat?: (userId: string, userName: string, ride?: any, trip?: any) => void
}

export default function RequestAgainModal({
  isOpen,
  onClose,
  onConfirm,
  confirmation,
  userId,
  loading,
  onStartChat
}: RequestAgainModalProps) {
  const [reason, setReason] = useState('')
  const [eligibility, setEligibility] = useState<{
    canRequest: boolean
    reason?: string
    lastRejection?: Date
    cooldownMinutes?: number
  }>({ canRequest: false })
  const [showReasonField, setShowReasonField] = useState(false)

  useEffect(() => {
    if (isOpen) {
      checkEligibility()
    }
  }, [isOpen, confirmation.id, userId])

  const checkEligibility = async () => {
    try {
      console.log('RequestAgainModal: Checking eligibility for confirmation:', confirmation.id)
      const result = await canRequestAgain(
        userId,
        confirmation.ride_id || undefined,
        confirmation.trip_id || undefined
      )
      console.log('RequestAgainModal: Eligibility result:', result)
      setEligibility(result)
    } catch (error) {
      console.error('Error checking request eligibility:', error)
      // Set default eligibility on error to prevent blocking UI
      setEligibility({ canRequest: false, reason: 'Error checking eligibility' })
    }
  }

  const handleConfirm = () => {
    console.log('RequestAgainModal: Confirming request again with reason:', reason)
    onConfirm(reason.trim() || undefined)
  }

  const getRideOrTripDetails = () => {
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    
    if (ride) {
      return {
        type: 'car ride',
        route: `${ride.from_location} → ${ride.to_location}`,
        timing: formatDateTimeSafe(ride.departure_date_time),
        icon: <Car size={20} className="text-green-600" />
      }
    }
    
    if (trip) {
      return {
        type: 'airport trip',
        route: `${trip.leaving_airport} → ${trip.destination_airport}`,
        timing: formatDateTimeSafe(trip.travel_date),
        icon: <Plane size={20} className="text-blue-600" />
      }
    }
    
    return {
      type: 'ride',
      route: 'Unknown route',
      timing: 'Unknown timing',
      icon: <AlertTriangle size={20} className="text-gray-600" />
    }
  }

  const formatLastRejection = (date: Date) => {
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)
    
    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} minutes ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`
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

  if (!isOpen) return null

  const rideDetails = getRideOrTripDetails()

  if (!eligibility.canRequest) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Cannot Request Again</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Not Available</h3>
            <p className="text-gray-600 mb-4">
              {eligibility.reason || 'You cannot request this ride again at this time.'}
            </p>
            {eligibility.cooldownMinutes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Cooldown Period:</strong> Please wait {eligibility.cooldownMinutes} more minutes before requesting again.
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              onClose()
              if (onStartChat) {
                onStartChat(
                  confirmation.ride_owner_id,
                  confirmation.user_profiles?.full_name || 'User',
                  confirmation.car_rides,
                  confirmation.trips
                )
              }
            }}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Back to Chat
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <RefreshCw size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Request Again</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Ride Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3 mb-3">
            {rideDetails.icon}
            <h3 className="font-semibold text-gray-900 capitalize">{rideDetails.type}</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Route:</strong> {rideDetails.route}</p>
            <p><strong>Timing:</strong> {rideDetails.timing}</p>
          </div>
        </div>

        {/* Previous Rejection Info */}
        {eligibility.lastRejection && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <X size={14} className="text-red-600" />
              <h4 className="font-semibold text-red-900">Previous Rejection</h4>
            </div>
            <p className="text-sm text-red-800">
              Your last request was rejected {formatLastRejection(eligibility.lastRejection)}.
            </p>
          </div>
        )}

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-3">Before Requesting Again:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Consider why your previous request was rejected</li>
            <li>• Chat with the ride owner to discuss any concerns</li>
            <li>• Make sure your travel plans haven't changed</li>
          </ul>
        </div>

        {/* Optional Reason Field */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Additional Message (Optional)
            </label>
            <button
              onClick={() => setShowReasonField(!showReasonField)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showReasonField ? 'Hide' : 'Add Message'}
            </button>
          </div>
          
          {showReasonField && (
            <div className="relative">
              <MessageCircle className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you'd like to request again or address any previous concerns..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none text-sm"
                rows={3}
                maxLength={200}
              />
              <div className="text-xs text-gray-500 mt-1">
                {reason.length}/200 characters
              </div>
            </div>
          )}
        </div>

        {/* Guidelines */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle size={14} className="text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800">
                Please be respectful when requesting again.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw size={16} />
                <span>Send Request</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}