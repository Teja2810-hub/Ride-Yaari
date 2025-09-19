import React, { useState } from 'react'
import { Check, X, MessageCircle, Car, Plane, Calendar, MapPin, Clock, User, AlertTriangle, History, RotateCcw, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { RideConfirmation } from '../types'
import DisclaimerModal from './DisclaimerModal'
import { getCurrencySymbol } from '../utils/currencies'
import { requestAgain, getReversalEligibility, canRequestAgain, reverseAction } from '../utils/confirmationHelpers'
import RequestAgainModal from './RequestAgainModal'
import ReversalModal from './ReversalModal'
import { useConfirmationFlow } from '../hooks/useConfirmationFlow'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface ConfirmationItemProps {
  confirmation: RideConfirmation
  onUpdate: () => void
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
}

export default function ConfirmationItem({ confirmation, onUpdate, onStartChat }: ConfirmationItemProps) {
  const { user } = useAuth()
  const { error, isLoading, clearError } = useErrorHandler()
  const { 
    confirmationState, 
    showDisclaimer, 
    hideDisclaimer, 
    acceptRequest, 
    rejectRequest, 
    cancelConfirmation 
  } = useConfirmationFlow({ 
    onUpdate,
    onSuccess: (message) => console.log(message)
  })
  const [showRequestAgainModal, setShowRequestAgainModal] = useState(false)
  const [showReversalModal, setShowReversalModal] = useState(false)
  const [showStatusHistory, setShowStatusHistory] = useState(false)
  const [canReverse, setCanReverse] = useState(false)
  const [reversalTimeRemaining, setReversalTimeRemaining] = useState<number | null>(null)
  const [canRequestAgainState, setCanRequestAgainState] = useState(true)
  const [requestCooldownTime, setRequestCooldownTime] = useState<Date | null>(null)

  // Check reversal eligibility and request-again eligibility on mount
  React.useEffect(() => {
    checkReversalEligibility()
    checkRequestAgainEligibility()
  }, [confirmation])

  const checkReversalEligibility = async () => {
    if (confirmation.status === 'rejected') {
      try {
        const eligibility = await getReversalEligibility(confirmation.id, user?.id || '')
        setCanReverse(eligibility.canReverse)
        setReversalTimeRemaining(eligibility.timeRemaining || null)
      } catch (error) {
        console.error('Error checking reversal eligibility:', error)
      }
    }
  }

  const checkRequestAgainEligibility = async () => {
    if (confirmation.status === 'rejected') {
      try {
        const eligibility = await canRequestAgain(
          user?.id || '',
          confirmation.ride_id || undefined,
          confirmation.trip_id || undefined
        )
        setCanRequestAgainState(eligibility.canRequest)
        setRequestCooldownTime(eligibility.lastRejection || null)
      } catch (error) {
        console.error('Error checking request again eligibility:', error)
      }
    }
  }

  const handleReverseAction = async (reason?: string) => {
    if (!user) return

    setShowReversalModal(false)

    try {
      const result = await reverseAction(confirmation.id, user.id, reason)
      
      if (!result.success) {
        alert(result.error || 'Failed to reverse action')
        return
      }

      onUpdate()
    } catch (error: any) {
      console.error('Error reversing action:', error)
      alert('Failed to reverse action. Please try again.')
    }
  }

  const handleRequestAgainAction = async (reason?: string) => {
    if (!user) return

    setShowRequestAgainModal(false)

    try {
      const result = await requestAgain(confirmation.id, user.id, reason)
      
      if (!result.success) {
        alert(result.error || 'Failed to send request again')
        return
      }

      onUpdate()
    } catch (error: any) {
      console.error('Error requesting again:', error)
      alert('Failed to send request. Please try again.')
    }
  }

  const isCurrentUserOwner = confirmation.ride_owner_id === user?.id
  const isCurrentUserPassenger = confirmation.passenger_id === user?.id
  const ride = confirmation.car_rides
  const trip = confirmation.trips
  const passenger = confirmation.user_profiles

  const getRideOrTripDetails = (): string => {
    if (ride) {
      return `car ride from ${ride.from_location} to ${ride.to_location} on ${new Date(ride.departure_date_time).toLocaleDateString()}`
    }
    if (trip) {
      return `airport trip from ${trip.leaving_airport} to ${trip.destination_airport} on ${new Date(trip.travel_date).toLocaleDateString()}`
    }
    return 'ride'
  }

  const handleAccept = async () => {
    if (!user) return
    hideDisclaimer()
    await acceptRequest(confirmation.id, user.id, confirmation.passenger_id)
  }

  const handleReject = async () => {
    if (!user) return
    hideDisclaimer()
    await rejectRequest(confirmation.id, user.id, confirmation.passenger_id)
  }

  const handleCancel = async () => {
    if (!user) return
    hideDisclaimer()
    await cancelConfirmation(
      confirmation.id, 
      user.id, 
      isCurrentUserOwner,
      ride,
      trip
    )
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDisclaimerContent = (type: string) => {
    const rideDetails = getRideOrTripDetails()
    
    switch (type) {
      case 'owner-accept-request':
        return {
          title: 'Accept Ride Request',
          points: [
            'This will confirm the passenger for your ride',
            'The passenger will be notified of your acceptance',
            'You are committing to provide the ride as discussed',
            'Make sure you have agreed on pickup details and payment'
          ],
          explanation: `You are accepting a passenger for the ${rideDetails}. This is a commitment to provide the ride.`
        }
      case 'owner-reject-request':
        return {
          title: 'Reject Ride Request',
          points: [
            'This will decline the passenger\'s request',
            'The passenger will be notified of your decision',
            'The passenger can request again if they wish',
            'Consider explaining your reason in chat'
          ],
          explanation: `You are rejecting a request for the ${rideDetails}. The passenger will be able to request again.`
        }
      case 'cancel-confirmed-ride':
        return {
          title: 'Cancel Confirmed Ride',
          points: [
            'This will cancel the confirmed ride arrangement',
            'The other party will be notified immediately',
            'This may affect your reputation on the platform',
            'Consider discussing the reason in chat first'
          ],
          explanation: `You are cancelling the confirmed ${rideDetails}. This should only be done if absolutely necessary.`
        }
      case 'request-ride-again':
        return {
          title: 'Request Ride Again',
          points: [
            'This will send a new request to join this ride',
            'The ride owner will be notified of your request',
            'Make sure you still want to join this ride',
            'Consider discussing any changes in chat first'
          ],
          explanation: `You are requesting to join the ${rideDetails} again after it was previously rejected.`
        }
      case 'reverse-action':
        return {
          title: 'Reverse Previous Action',
          points: [
            'This will reverse your previous rejection or cancellation',
            'The confirmation will be restored to accepted status',
            'The other party will be notified of this reversal',
            'This action can only be done within 24 hours',
            'Make sure you want to proceed with the original arrangement'
          ],
          explanation: `You are reversing your previous action for the ${rideDetails}. This will restore the confirmation.`
        }
      default:
        return {
          title: 'Confirm Action',
          points: ['Please confirm this action'],
          explanation: 'This action cannot be undone.'
        }
    }
  }

  const getOtherUserId = () => {
    return isCurrentUserOwner ? confirmation.passenger_id : confirmation.ride_owner_id
  }

  const getOtherUserName = () => {
    if (isCurrentUserOwner) {
      return passenger.full_name
    }
    // If current user is passenger, we need to get the owner's name
    // This would require additional data fetching or we can use a placeholder
    return ride?.user_id || trip?.user_id ? 'Ride Owner' : 'Unknown'
  }

  return (
    <>
      {error && (
        <ErrorMessage
          message={error}
          onRetry={clearError}
          onDismiss={clearError}
          className="mb-4"
        />
      )}
      
      {isLoading && (
        <div className="mb-4">
          <LoadingSpinner text="Processing request..." />
        </div>
      )}
      
      <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
              {passenger.profile_image_url ? (
                <img
                  src={passenger.profile_image_url}
                  alt={passenger.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold">
                  {passenger.full_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{passenger.full_name}</h3>
              <p className="text-sm text-gray-600">
                {isCurrentUserOwner ? (
                  <>
                    {confirmation.status === 'pending' ? 'wants to join your' : 
                     confirmation.status === 'accepted' ? 'confirmed for your' : 
                     'was rejected from your'} {ride ? 'car ride' : 'airport trip'}
                  </>
                ) : (
                  <>
                    You {confirmation.status === 'pending' ? 'requested to join' : 
                         confirmation.status === 'accepted' ? 'are confirmed for' : 
                         'were rejected from'} this {ride ? 'car ride' : 'airport trip'}
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              confirmation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              confirmation.status === 'accepted' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {confirmation.status.charAt(0).toUpperCase() + confirmation.status.slice(1)}
            </span>
            {ride ? (
              <Car size={20} className="text-green-600" />
            ) : (
              <Plane size={20} className="text-blue-600" />
            )}
          </div>
        </div>

        {/* Ride/Trip Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          {ride && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">From</p>
                <div className="font-medium text-gray-900 flex items-center">
                  <MapPin size={14} className="mr-1 text-gray-400" />
                  {ride.from_location}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">To</p>
                <div className="font-medium text-gray-900 flex items-center">
                  <MapPin size={14} className="mr-1 text-gray-400" />
                  {ride.to_location}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Departure</p>
                <div className="font-medium text-gray-900 flex items-center">
                  <Clock size={14} className="mr-1 text-gray-400" />
                  {formatDateTime(ride.departure_date_time)}
                </div>
              </div>
            </div>
          )}

          {trip && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">From</p>
                <div className="font-medium text-gray-900">{trip.leaving_airport}</div>
                {trip.departure_time && (
                  <div className="text-sm text-gray-600 flex items-center mt-1">
                    <Clock size={12} className="mr-1" />
                    {trip.departure_time}
                    {trip.departure_timezone && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({trip.departure_timezone})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">To</p>
                <div className="font-medium text-gray-900">{trip.destination_airport}</div>
                {trip.landing_time && (
                  <div className="text-sm text-gray-600 flex items-center mt-1">
                    <Clock size={12} className="mr-1" />
                    {trip.landing_time}
                    {trip.landing_timezone && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({trip.landing_timezone})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                <div className="font-medium text-gray-900 flex items-center">
                  <Calendar size={14} className="mr-1 text-gray-400" />
                  {formatDate(trip.travel_date)}
                </div>
                {trip.landing_date && trip.landing_date !== trip.travel_date && (
                  <div className="text-sm text-gray-600 mt-1">
                    Landing: {formatDate(trip.landing_date)}
                  </div>
                )}
              </div>
            </div>
          )}

          {(ride?.price || trip?.price) && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-green-600">
                Price: {getCurrencySymbol((ride?.currency || trip?.currency) || 'USD')}{ride?.price || trip?.price}
                {(ride?.negotiable || trip?.negotiable) && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                    Negotiable
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Status History Toggle */}
        {showStatusHistory && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <History size={16} className="mr-2" />
              Status History
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xs">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Request Submitted</p>
                  <p className="text-gray-600">{formatDateTime(confirmation.created_at)}</p>
                </div>
              </div>
              
              {confirmation.confirmed_at && (
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    confirmation.status === 'accepted' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <span className={`font-bold text-xs ${
                      confirmation.status === 'accepted' ? 'text-green-600' : 'text-red-600'
                    }`}>2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Request {confirmation.status === 'accepted' ? 'Accepted' : 'Rejected'}
                    </p>
                    <p className="text-gray-600">{formatDateTime(confirmation.confirmed_at)}</p>
                  </div>
                </div>
              )}
              
              {confirmation.updated_at !== confirmation.created_at && confirmation.updated_at !== confirmation.confirmed_at && (
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-bold text-xs">•</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Status Updated</p>
                    <p className="text-gray-600">{formatDateTime(confirmation.updated_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
          <button
            onClick={() => onStartChat(getOtherUserId(), getOtherUserName(), ride, trip)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <MessageCircle size={16} />
            <span>Chat with {isCurrentUserOwner ? passenger.full_name : 'Ride Owner'}</span>
          </button>
            
            <button
              onClick={() => setShowStatusHistory(!showStatusHistory)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 font-medium transition-colors text-sm"
            >
              <History size={14} />
              <span>{showStatusHistory ? 'Hide' : 'Show'} History</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* Pending status actions */}
            {confirmation.status === 'pending' && isCurrentUserOwner && (
              <>
                <button
                  onClick={() => showDisclaimer('owner-reject-request', confirmation)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                >
                  <X size={16} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => showDisclaimer('owner-accept-request', confirmation)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                >
                  <Check size={16} />
                  <span>Accept</span>
                </button>
              </>
            )}

            {/* Pending status for passengers */}
            {confirmation.status === 'pending' && isCurrentUserPassenger && (
              <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-medium text-sm">
                <Clock size={16} />
                <span>Awaiting Response</span>
              </div>
            )}

            {/* Accepted status actions */}
            {confirmation.status === 'accepted' && (
              <button
                onClick={() => showDisclaimer('cancel-confirmed-ride', confirmation)}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
              >
                <AlertTriangle size={16} />
                <span>Cancel Ride</span>
              </button>
            )}

            {/* Rejected status actions */}
            {confirmation.status === 'rejected' && isCurrentUserPassenger && (
              <div className="flex items-center space-x-2">
                {canReverse && reversalTimeRemaining && reversalTimeRemaining > 0 && (
                  <button
                    onClick={() => setShowReversalModal(true)}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    <RotateCcw size={16} />
                    <span>Undo Rejection ({Math.ceil(reversalTimeRemaining)}h left)</span>
                  </button>
                )}
                {canRequestAgainState && (
                  <button
                    onClick={() => setShowRequestAgainModal(true)}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    <RefreshCw size={16} />
                    <span>Request Again</span>
                  </button>
                )}
                {!canRequestAgainState && requestCooldownTime && (
                  <div className="flex items-center space-x-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm">
                    <Clock size={16} />
                    <span>Cooldown active</span>
                  </div>
                )}
              </div>
            )}

            {/* Rejected status actions for owners */}
            {confirmation.status === 'rejected' && isCurrentUserOwner && canReverse && reversalTimeRemaining && reversalTimeRemaining > 0 && (
              <button
                onClick={() => setShowReversalModal(true)}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
              >
                <RotateCcw size={16} />
                <span>Undo Rejection ({Math.ceil(reversalTimeRemaining)}h left)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Disclaimer Modals */}
      <DisclaimerModal
        isOpen={confirmationState.showDisclaimer && confirmationState.disclaimerType === 'owner-accept-request'}
        onClose={hideDisclaimer}
        onConfirm={handleAccept}
        loading={isLoading}
        type="owner-accept-request"
        content={getDisclaimerContent('owner-accept-request')}
      />

      <DisclaimerModal
        isOpen={confirmationState.showDisclaimer && confirmationState.disclaimerType === 'owner-reject-request'}
        onClose={hideDisclaimer}
        onConfirm={handleReject}
        loading={isLoading}
        type="owner-reject-request"
        content={getDisclaimerContent('owner-reject-request')}
      />

      <DisclaimerModal
        isOpen={confirmationState.showDisclaimer && confirmationState.disclaimerType === 'cancel-confirmed-ride'}
        onClose={hideDisclaimer}
        onConfirm={handleCancel}
        loading={isLoading}
        type="cancel-confirmed-ride"
        content={getDisclaimerContent('cancel-confirmed-ride')}
      />

      <ReversalModal
        isOpen={showReversalModal}
        onClose={() => setShowReversalModal(false)}
        onConfirm={handleReverseAction}
        confirmation={confirmation}
        userId={user?.id || ''}
        loading={isLoading}
      />

      <RequestAgainModal
        isOpen={showRequestAgainModal}
        onClose={() => setShowRequestAgainModal(false)}
        onConfirm={handleRequestAgainAction}
        confirmation={confirmation}
        userId={user?.id || ''}
        loading={isLoading}
      />
    </>
  )
}