import React, { useState } from 'react'
import { Check, X, MessageCircle, Car, Plane, Calendar, MapPin, Clock, User, AlertTriangle, History, RotateCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideConfirmation } from '../types'
import DisclaimerModal from './DisclaimerModal'
import { getCurrencySymbol } from '../utils/currencies'
import { notificationService } from '../utils/notificationService'
import ConfirmationActions from './ConfirmationActions'
import { getConfirmationExpiryInfo } from '../utils/confirmationHelpers'
import ConfirmationExpiryBadge from './ConfirmationExpiryBadge'

interface ConfirmationItemProps {
  confirmation: RideConfirmation & { canRequestAgain?: boolean; canReverse?: boolean }
  onUpdate: () => void
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
}

export default function ConfirmationItem({ confirmation, onUpdate, onStartChat }: ConfirmationItemProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showAcceptDisclaimer, setShowAcceptDisclaimer] = useState(false)
  const [showRejectDisclaimer, setShowRejectDisclaimer] = useState(false)
  const [showCancelDisclaimer, setShowCancelDisclaimer] = useState(false)
  const [showRequestAgainDisclaimer, setShowRequestAgainDisclaimer] = useState(false)
  const [showStatusHistory, setShowStatusHistory] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const expiryInfo = getConfirmationExpiryInfo(confirmation)

  const sendEnhancedSystemMessage = async (
    action: 'accept' | 'reject' | 'cancel' | 'request',
    userRole: 'owner' | 'passenger',
    senderId: string,
    receiverId: string
  ) => {
    try {
      await notificationService.sendEnhancedSystemMessage(
        action,
        userRole,
        senderId,
        receiverId,
        ride,
        trip,
        `Confirmation ID: ${confirmation.id}`
      )
    } catch (error) {
      console.error('Error sending enhanced system message:', error)
    }
  }
  const isCurrentUserOwner = confirmation.ride_owner_id === user?.id
  const isCurrentUserPassenger = confirmation.passenger_id === user?.id
  const ride = confirmation.car_rides
  const trip = confirmation.trips
  const passenger = confirmation.user_profiles

  const sendSystemMessage = async (message: string, senderId: string, receiverId: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message_content: message,
        message_type: 'system',
        is_read: false
      })
    
    if (error) {
      console.error('Error sending system message:', error)
    }
  }

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

    setShowAcceptDisclaimer(false)
    setLoading(true)

    try {
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'accepted',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmation.id)

      if (error) throw error

      // Send system message to passenger
      await sendEnhancedSystemMessage('accept', 'passenger', user.id, confirmation.passenger_id)

      onUpdate()
    } catch (error: any) {
      console.error('Error accepting request:', error)
      alert('Failed to accept request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!user) return

    setShowRejectDisclaimer(false)
    setLoading(true)

    try {
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmation.id)

      if (error) throw error

      // Send system message to passenger
      await sendEnhancedSystemMessage('reject', 'passenger', user.id, confirmation.passenger_id)

      onUpdate()
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!user) return

    setShowCancelDisclaimer(false)
    setLoading(true)

    try {
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmation.id)

      if (error) throw error

      // Send system message to the other party
      const receiverId = isCurrentUserOwner ? confirmation.passenger_id : confirmation.ride_owner_id
      const userRole = isCurrentUserOwner ? 'owner' : 'passenger'
      
      await sendEnhancedSystemMessage('cancel', userRole, user.id, receiverId)

      onUpdate()
    } catch (error: any) {
      console.error('Error cancelling ride:', error)
      alert('Failed to cancel ride. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestAgain = async () => {
    if (!user) return

    setShowRequestAgainDisclaimer(false)
    setLoading(true)

    try {
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'pending',
          confirmed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmation.id)

      if (error) throw error

      // Send system message to ride owner
      await sendEnhancedSystemMessage('request', 'owner', user.id, confirmation.ride_owner_id)

      onUpdate()
    } catch (error: any) {
      console.error('Error requesting again:', error)
      alert('Failed to send request. Please try again.')
    } finally {
      setLoading(false)
    }
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
            <ConfirmationExpiryBadge confirmation={confirmation} />
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

        {/* Expiry Information */}
        {expiryInfo.willExpire && !expiryInfo.isExpired && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {expiryInfo.timeUntilExpiry ? `Expires in ${expiryInfo.timeUntilExpiry}` : 'Expiring soon'}
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
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-sm font-medium text-red-800">
                This confirmation has expired
              </span>
            </div>
          </div>
        )}

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
            
            {(confirmation.canRequestAgain || confirmation.canReverse) && (
              <button
                onClick={() => setShowActions(!showActions)}
                className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium transition-colors text-sm"
              >
                <RotateCcw size={14} />
                <span>{showActions ? 'Hide' : 'Show'} Actions</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Pending status actions */}
            {confirmation.status === 'pending' && isCurrentUserOwner && (
              <>
                <button
                  onClick={() => setShowRejectDisclaimer(true)}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                >
                  <X size={16} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => setShowAcceptDisclaimer(true)}
                  disabled={loading}
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
                onClick={() => setShowCancelDisclaimer(true)}
                disabled={loading}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
              >
                <AlertTriangle size={16} />
                <span>Cancel Ride</span>
              </button>
            )}

            {/* Rejected status actions */}
            {confirmation.status === 'rejected' && isCurrentUserPassenger && (
              <button
                onClick={() => setShowRequestAgainDisclaimer(true)}
                disabled={loading}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
              >
                <Check size={16} />
                <span>Request Again</span>
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Actions */}
        {showActions && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ConfirmationActions
              confirmation={confirmation}
              userId={user?.id || ''}
              onUpdate={onUpdate}
              onStartChat={onStartChat}
            />
          </div>
        )}
      </div>

      {/* Disclaimer Modals */}
      <DisclaimerModal
        isOpen={showAcceptDisclaimer}
        onClose={() => setShowAcceptDisclaimer(false)}
        onConfirm={handleAccept}
        loading={loading}
        type="owner-accept-request"
        content={getDisclaimerContent('owner-accept-request')}
      />

      <DisclaimerModal
        isOpen={showRejectDisclaimer}
        onClose={() => setShowRejectDisclaimer(false)}
        onConfirm={handleReject}
        loading={loading}
        type="owner-reject-request"
        content={getDisclaimerContent('owner-reject-request')}
      />

      <DisclaimerModal
        isOpen={showCancelDisclaimer}
        onClose={() => setShowCancelDisclaimer(false)}
        onConfirm={handleCancel}
        loading={loading}
        type="cancel-confirmed-ride"
        content={getDisclaimerContent('cancel-confirmed-ride')}
      />

      <DisclaimerModal
        isOpen={showRequestAgainDisclaimer}
        onClose={() => setShowRequestAgainDisclaimer(false)}
        onConfirm={handleRequestAgain}
        loading={loading}
        type="request-ride-again"
        content={getDisclaimerContent('request-ride-again')}
      />
    </>
  )
}