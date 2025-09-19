import React, { useState } from 'react'
import { RotateCcw, Clock, AlertTriangle, MessageCircle, Check, X } from 'lucide-react'
import { RideConfirmation } from '../types'
import { requestAgain, reverseCancellation, canReverseConfirmation, getConfirmationExpiryInfo } from '../utils/confirmationHelpers'
import DisclaimerModal from './DisclaimerModal'

interface ConfirmationActionsProps {
  confirmation: RideConfirmation & { canRequestAgain?: boolean; canReverse?: boolean }
  userId: string
  onUpdate: () => void
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
}

export default function ConfirmationActions({ 
  confirmation, 
  userId, 
  onUpdate, 
  onStartChat 
}: ConfirmationActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showRequestAgainModal, setShowRequestAgainModal] = useState(false)
  const [showReverseModal, setShowReverseModal] = useState(false)
  const [requestReason, setRequestReason] = useState('')
  const [reverseReason, setReverseReason] = useState('')
  const [error, setError] = useState('')

  const isCurrentUserOwner = confirmation.ride_owner_id === userId
  const isCurrentUserPassenger = confirmation.passenger_id === userId
  const ride = confirmation.car_rides
  const trip = confirmation.trips
  const expiryInfo = getConfirmationExpiryInfo(confirmation)
  const reversalInfo = canReverseConfirmation(confirmation, userId)

  const handleRequestAgain = async () => {
    setLoading('request-again')
    setError('')

    try {
      const result = await requestAgain(confirmation.id, userId, requestReason.trim() || undefined)
      
      if (result.success) {
        setShowRequestAgainModal(false)
        setRequestReason('')
        onUpdate()
      } else {
        setError(result.error || 'Failed to request again')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to request again')
    } finally {
      setLoading(null)
    }
  }

  const handleReverseCancellation = async () => {
    setLoading('reverse')
    setError('')

    try {
      const result = await reverseCancellation(confirmation.id, userId, reverseReason.trim() || undefined)
      
      if (result.success) {
        setShowReverseModal(false)
        setReverseReason('')
        onUpdate()
      } else {
        setError(result.error || 'Failed to reverse cancellation')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to reverse cancellation')
    } finally {
      setLoading(null)
    }
  }

  const formatTimeUntilExpiry = () => {
    if (!expiryInfo.timeUntilExpiry) return ''
    return `Expires in ${expiryInfo.timeUntilExpiry}`
  }

  const getOtherUserId = () => {
    return isCurrentUserOwner ? confirmation.passenger_id : confirmation.ride_owner_id
  }

  const getOtherUserName = () => {
    if (isCurrentUserOwner) {
      return confirmation.user_profiles.full_name
    }
    // For passengers viewing owner's confirmations, we'd need additional data
    return 'Ride Owner'
  }

  return (
    <>
      <div className="space-y-4">
        {/* Expiry Information */}
        {expiryInfo.willExpire && !expiryInfo.isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {formatTimeUntilExpiry()}
              </span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              {confirmation.status === 'pending' 
                ? 'This request will automatically expire if not responded to.'
                : 'This confirmation will be archived after the expiry period.'
              }
            </p>
          </div>
        )}

        {/* Expired Notice */}
        {expiryInfo.isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-sm font-medium text-red-800">
                This confirmation has expired
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Chat Button */}
          <button
            onClick={() => onStartChat(getOtherUserId(), getOtherUserName(), ride, trip)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
          >
            <MessageCircle size={16} />
            <span>Chat</span>
          </button>

          {/* Request Again Button */}
          {confirmation.canRequestAgain && isCurrentUserPassenger && (
            <button
              onClick={() => setShowRequestAgainModal(true)}
              disabled={loading === 'request-again'}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
            >
              <RotateCcw size={16} />
              <span>{loading === 'request-again' ? 'Requesting...' : 'Request Again'}</span>
            </button>
          )}

          {/* Reverse Cancellation Button */}
          {reversalInfo.canReverse && (
            <button
              onClick={() => setShowReverseModal(true)}
              disabled={loading === 'reverse'}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
            >
              <RotateCcw size={16} />
              <span>{loading === 'reverse' ? 'Reversing...' : 'Undo Cancellation'}</span>
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Request Again Modal */}
      <DisclaimerModal
        isOpen={showRequestAgainModal}
        onClose={() => {
          setShowRequestAgainModal(false)
          setRequestReason('')
          setError('')
        }}
        onConfirm={handleRequestAgain}
        loading={loading === 'request-again'}
        type="request-ride-again"
        content={{
          title: 'Request Ride Again',
          points: [
            'This will send a new request to join this ride',
            'The ride owner will be notified of your request',
            'You can include a message explaining why you want to request again',
            'The owner can accept or reject this new request',
            'Make sure you still want to join this ride'
          ],
          explanation: `You are requesting to join this ${ride ? 'car ride' : 'airport trip'} again after it was previously rejected.`
        }}
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message to Driver/Traveler (Optional)
          </label>
          <textarea
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
            placeholder="Explain why you'd like to request again (e.g., 'My plans have changed and I can now meet your requirements')"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {requestReason.length}/200 characters
          </p>
        </div>
      </DisclaimerModal>

      {/* Reverse Cancellation Modal */}
      <DisclaimerModal
        isOpen={showReverseModal}
        onClose={() => {
          setShowReverseModal(false)
          setReverseReason('')
          setError('')
        }}
        onConfirm={handleReverseCancellation}
        loading={loading === 'reverse'}
        type="reverse-cancellation"
        content={{
          title: 'Undo Cancellation',
          points: [
            'This will restore the cancelled ride confirmation',
            'The other party will be notified that the ride is back on',
            'You can only reverse cancellations within 24 hours',
            'Both parties will be committed to the ride again',
            'Make sure you can still provide/join the ride as planned'
          ],
          explanation: `You are restoring the cancelled ${ride ? 'car ride' : 'airport trip'}. This should only be done if you can fulfill your original commitment.`
        }}
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Reversal (Optional)
          </label>
          <textarea
            value={reverseReason}
            onChange={(e) => setReverseReason(e.target.value)}
            placeholder="Explain why you're reversing the cancellation (e.g., 'Cancelled by mistake' or 'Issue resolved')"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {reverseReason.length}/200 characters
          </p>
        </div>
      </DisclaimerModal>
    </>
  )
}