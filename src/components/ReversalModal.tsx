import React, { useState, useEffect } from 'react'
import { RotateCcw, X, Clock, TriangleAlert as AlertTriangle, Car, Plane, MessageCircle, CircleCheck as CheckCircle } from 'lucide-react'
import { getReversalEligibility } from '../utils/confirmationHelpers'
import { RideConfirmation } from '../types'

interface ReversalModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  confirmation: RideConfirmation
  userId: string
  loading: boolean
}

export default function ReversalModal({
  isOpen,
  onClose,
  onConfirm,
  confirmation,
  userId,
  loading
}: ReversalModalProps) {
  const [reason, setReason] = useState('')
  const [eligibility, setEligibility] = useState<{
    canReverse: boolean
    reason?: string
    timeRemaining?: number
    reversalType?: 'cancellation' | 'rejection'
  }>({ canReverse: false })
  const [showReasonField, setShowReasonField] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      checkEligibility()
    }
  }, [isOpen, confirmation.id, userId])

  useEffect(() => {
    if (eligibility.timeRemaining && eligibility.timeRemaining > 0) {
      const interval = setInterval(() => {
        const hours = Math.floor(eligibility.timeRemaining!)
        const minutes = Math.floor((eligibility.timeRemaining! % 1) * 60)
        setTimeLeft(`${hours}h ${minutes}m`)
      }, 60000) // Update every minute

      // Initial calculation
      const hours = Math.floor(eligibility.timeRemaining)
      const minutes = Math.floor((eligibility.timeRemaining % 1) * 60)
      setTimeLeft(`${hours}h ${minutes}m`)

      return () => clearInterval(interval)
    }
  }, [eligibility.timeRemaining])

  const checkEligibility = async () => {
    try {
      const result = await getReversalEligibility(confirmation.id, userId)
      setEligibility(result)
    } catch (error) {
      console.error('Error checking reversal eligibility:', error)
    }
  }

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined)
  }

  const getRideOrTripDetails = () => {
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    
    if (ride) {
      return {
        type: 'car ride',
        route: `${ride.from_location} → ${ride.to_location}`,
        timing: new Date(ride.departure_date_time).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        icon: <Car size={20} className="text-green-600" />
      }
    }
    
    if (trip) {
      return {
        type: 'airport trip',
        route: `${trip.leaving_airport} → ${trip.destination_airport}`,
        timing: new Date(trip.travel_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
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

  const getReversalTypeText = () => {
    switch (eligibility.reversalType) {
      case 'cancellation':
        return 'cancellation'
      case 'rejection':
        return 'rejection'
      default:
        return 'action'
    }
  }

  if (!isOpen) return null

  const rideDetails = getRideOrTripDetails()
  const isOwner = confirmation.ride_owner_id === userId

  if (!eligibility.canReverse) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Cannot Reverse Action</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reversal Not Available</h3>
            <p className="text-gray-600 mb-4">
              {eligibility.reason || 'This action cannot be reversed at this time.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <RotateCcw size={20} className="text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Reverse {getReversalTypeText()}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Time Remaining Alert */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Clock size={16} className="text-orange-600" />
            <h4 className="font-semibold text-orange-900">Time Sensitive Action</h4>
          </div>
          <p className="text-sm text-orange-800">
            You have <strong>{timeLeft}</strong> remaining to reverse this {getReversalTypeText()}. 
            After 24 hours, this option will no longer be available.
          </p>
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

        {/* What This Does */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-3">What This Will Do:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Restore the confirmation to "accepted" status</li>
            <li>• Notify the other party of the reversal</li>
            <li>• Reactivate the ride arrangement</li>
            <li>• Allow you to proceed with the original plan</li>
            {isOwner ? (
              <li>• The passenger will be confirmed for your ride again</li>
            ) : (
              <li>• You will be confirmed for the ride again</li>
            )}
          </ul>
        </div>

        {/* Optional Reason Field */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Explanation (Optional)
            </label>
            <button
              onClick={() => setShowReasonField(!showReasonField)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showReasonField ? 'Hide' : 'Add Explanation'}
            </button>
          </div>
          
          {showReasonField && (
            <div className="relative">
              <MessageCircle className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Explain why you're reversing this ${getReversalTypeText()}...`}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors resize-none"
                rows={3}
                maxLength={200}
              />
              <div className="text-xs text-gray-500 mt-1">
                {reason.length}/200 characters
              </div>
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle size={16} className="text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Important Notice</h4>
              <p className="text-sm text-yellow-800">
                Reversing this {getReversalTypeText()} will restore the original ride arrangement. 
                Make sure you're ready to proceed with the {ride ? 'ride' : 'trip'} as originally planned. 
                The other party will be notified immediately and may have already made alternative plans.
                {eligibility.reversalType === 'cancellation' 
                  ? ' Consider apologizing for the inconvenience caused by the cancellation.'
                  : ' Consider explaining why you changed your mind about the rejection.'
                }
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
            className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Reversing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <RotateCcw size={16} />
                <span>Reverse {getReversalTypeText()}</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}