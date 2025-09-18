import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, MessageCircle, Check, X, Clock, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { ChatMessage, RideConfirmation, CarRide, Trip } from '../types'
import RideConfirmationModal from './RideConfirmationModal'
import DisclaimerModal from './DisclaimerModal'

interface ChatProps {
  onBack: () => void
  otherUserId: string
  otherUserName: string
  preSelectedRide?: CarRide
  preSelectedTrip?: Trip
}

export default function Chat({ onBack, otherUserId, otherUserName, preSelectedRide, preSelectedTrip }: ChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentConfirmation, setCurrentConfirmation] = useState<RideConfirmation | null>(null)
  const [showPassengerRequestDisclaimer, setShowPassengerRequestDisclaimer] = useState(false)
  const [showOwnerAcceptDisclaimer, setShowOwnerAcceptDisclaimer] = useState(false)
  const [showOwnerRejectDisclaimer, setShowOwnerRejectDisclaimer] = useState(false)
  const [showCancelConfirmedDisclaimer, setShowCancelConfirmedDisclaimer] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      fetchMessages()
      fetchConfirmationStatus()
      
      // Subscribe to new messages
      const subscription = supabase
        .channel('chat_messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `or(and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}))`,
          },
          (payload) => {
            fetchMessages()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ride_confirmations',
          },
          () => {
            fetchConfirmationStatus()
            fetchMessages()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user, otherUserId, preSelectedRide, preSelectedTrip])

  // Helper functions
  const isCurrentUserOwnerOfPreselected = (): boolean => {
    if (preSelectedRide) return preSelectedRide.user_id === user?.id
    if (preSelectedTrip) return preSelectedTrip.user_id === user?.id
    return false
  }

  const isCurrentUserPassengerOfConfirmation = (): boolean => {
    return currentConfirmation?.passenger_id === user?.id
  }

  const isCurrentUserOwnerOfConfirmation = (): boolean => {
    return currentConfirmation?.ride_owner_id === user?.id
  }

  const sendSystemMessage = async (message: string, senderId: string, receiverId: string) => {
    await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message_content: message,
        message_type: 'system',
        is_read: false
      })
  }

  const getRideOrTripDetails = (ride?: CarRide, trip?: Trip): string => {
    if (ride) {
      return `car ride from ${ride.from_location} to ${ride.to_location} on ${new Date(ride.departure_date_time).toLocaleDateString()}`
    }
    if (trip) {
      return `airport trip from ${trip.leaving_airport} to ${trip.destination_airport} on ${new Date(trip.travel_date).toLocaleDateString()}`
    }
    return 'ride'
  }

  const fetchConfirmationStatus = async () => {
    if (!user || (!preSelectedRide && !preSelectedTrip)) return

    try {
      let query = supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name
          ),
          car_rides!ride_confirmations_ride_id_fkey (
            id,
            from_location,
            to_location,
            departure_date_time,
            price,
            currency,
            user_id
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date,
            price,
            currency,
            user_id
          )
        `)

      if (preSelectedRide) {
        query = query
          .eq('ride_id', preSelectedRide.id)
          .or(`and(ride_owner_id.eq.${user.id},passenger_id.eq.${otherUserId}),and(ride_owner_id.eq.${otherUserId},passenger_id.eq.${user.id})`)
      } else if (preSelectedTrip) {
        query = query
          .eq('trip_id', preSelectedTrip.id)
          .or(`and(ride_owner_id.eq.${user.id},passenger_id.eq.${otherUserId}),and(ride_owner_id.eq.${otherUserId},passenger_id.eq.${user.id})`)
      }

      const { data, error } = await query.single()

      if (!error && data) {
        setCurrentConfirmation(data)
      } else {
        setCurrentConfirmation(null)
      }
    } catch (error) {
      console.error('Error fetching confirmation status:', error)
      setCurrentConfirmation(null)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:user_profiles!chat_messages_sender_id_fkey (
            id,
            full_name
          ),
          receiver:user_profiles!chat_messages_receiver_id_fkey (
            id,
            full_name
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at')

      if (!error && data) {
        setMessages(data)
      }
    } catch (error) {
      console.error('Fetch messages error:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || sending) return

    setSending(true)

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          message_content: newMessage.trim(),
          is_read: false,
        })

      if (error) throw error

      setNewMessage('')
      fetchMessages()
    } catch (error) {
      console.error('Send message error:', error)
    } finally {
      setSending(false)
    }
  }

  const handlePassengerRequestConfirmation = () => {
    setShowPassengerRequestDisclaimer(true)
  }

  const handleConfirmPassengerRequest = async () => {
    if (!user) return

    setShowPassengerRequestDisclaimer(false)

    try {
      const isOwner = isCurrentUserOwnerOfPreselected()
      let rideId = null
      let tripId = null
      let rideOwnerId = isOwner ? user.id : otherUserId
      let passengerId = isOwner ? otherUserId : user.id
      
      if (preSelectedRide) {
        rideId = preSelectedRide.id
      } else if (preSelectedTrip) {
        tripId = preSelectedTrip.id
      }

      let error
      
      if (currentConfirmation && currentConfirmation.status === 'rejected') {
        // Update existing rejected confirmation to pending
        const result = await supabase
          .from('ride_confirmations')
          .update({
            status: 'pending',
            confirmed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentConfirmation.id)
        error = result.error
      } else {
        // Insert new confirmation
        const result = await supabase
          .from('ride_confirmations')
          .insert({
            ride_id: rideId,
            trip_id: tripId,
            ride_owner_id: rideOwnerId,
            passenger_id: passengerId,
            status: 'pending'
          })
        error = result.error
      }

      if (error) throw error

      // Send system message
      const rideDetails = getRideOrTripDetails(preSelectedRide, preSelectedTrip)
      const systemMessage = isOwner 
        ? `🚗 You have sent a ride offer for the ${rideDetails}. The passenger can accept or decline this offer.`
        : `🚗 You have requested to join the ${rideDetails}. The ride owner can accept or reject your request.`
      
      await sendSystemMessage(systemMessage, user.id, isOwner ? passengerId : rideOwnerId)

      fetchMessages()
      fetchConfirmationStatus()
    } catch (error: any) {
      console.error('Error creating confirmation:', error)
      alert('Failed to send confirmation request. Please try again.')
    }
  }

  const handleOwnerAcceptRequest = () => {
    setShowOwnerAcceptDisclaimer(true)
  }

  const handleConfirmOwnerAcceptRequest = async () => {
    if (!user) return

    setShowOwnerAcceptDisclaimer(false)

    try {
      if (!currentConfirmation) return

      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'accepted',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentConfirmation.id)

      if (error) throw error

      // Send system message to passenger
      const rideDetails = getRideOrTripDetails(currentConfirmation.car_rides, currentConfirmation.trips)
      const systemMessage = `🎉 Great news! Your request for the ${rideDetails} has been ACCEPTED! You can now coordinate pickup details and payment.`
      
      await sendSystemMessage(systemMessage, user.id, currentConfirmation.passenger_id)

      fetchMessages()
      fetchConfirmationStatus()
    } catch (error: any) {
      console.error('Error accepting request:', error)
      alert('Failed to accept request. Please try again.')
    }
  }

  const handleOwnerRejectRequest = () => {
    setShowOwnerRejectDisclaimer(true)
  }

  const handleConfirmOwnerRejectRequest = async () => {
    if (!user) return

    setShowOwnerRejectDisclaimer(false)

    try {
      if (!currentConfirmation) return

      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentConfirmation.id)

      if (error) throw error

      // Send system message to passenger
      const rideDetails = getRideOrTripDetails(currentConfirmation.car_rides, currentConfirmation.trips)
      const systemMessage = `😔 Unfortunately, your request for the ${rideDetails} has been declined. You can request to join this ride again if needed.`
      
      await sendSystemMessage(systemMessage, user.id, currentConfirmation.passenger_id)

      fetchMessages()
      fetchConfirmationStatus()
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject request. Please try again.')
    }
  }

  const handleCancelConfirmedRide = () => {
    setShowCancelConfirmedDisclaimer(true)
  }

  const handleConfirmCancelConfirmedRide = async () => {
    if (!user) return

    setShowCancelConfirmedDisclaimer(false)

    try {
      if (!currentConfirmation) return

      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentConfirmation.id)

      if (error) throw error

      // Send system message to the other party
      const rideDetails = getRideOrTripDetails(currentConfirmation.car_rides, currentConfirmation.trips)
      const isOwner = isCurrentUserOwnerOfConfirmation()
      const receiverId = isOwner ? currentConfirmation.passenger_id : currentConfirmation.ride_owner_id
      const systemMessage = isOwner
        ? `😔 The ride owner has cancelled the ${rideDetails}. You can request to join this ride again if it becomes available.`
        : `😔 The passenger has cancelled their spot on the ${rideDetails}. The ride is now available for other passengers.`
      
      await sendSystemMessage(systemMessage, user.id, receiverId)

      fetchMessages()
      fetchConfirmationStatus()
    } catch (error: any) {
      console.error('Error cancelling ride:', error)
      alert('Failed to cancel ride. Please try again.')
    }
  }

  const getConfirmationButtonText = () => {
    if (!currentConfirmation) {
      // No confirmation exists - show request button
      const isOwner = isCurrentUserOwnerOfPreselected()
      return isOwner ? 'Send Ride Offer' : 'Request Ride Confirmation'
    }

    const status = currentConfirmation.status
    const isOwner = isCurrentUserOwnerOfConfirmation()
    const isPassenger = isCurrentUserPassengerOfConfirmation()

    if (status === 'pending') {
      if (isOwner) {
        return 'Request Pending - Awaiting Response'
      } else if (isPassenger) {
        return 'Offer Pending - Respond Below'
      }
    } else if (status === 'accepted') {
      return 'Ride Confirmed ✓'
    } else if (status === 'rejected') {
      return 'Request Ride Again'
    }

    return 'Request Ride Confirmation'
  }

  const isConfirmationButtonDisabled = () => {
    if (!currentConfirmation) return false

    const status = currentConfirmation.status
    const isOwner = isCurrentUserOwnerOfConfirmation()
    const isPassenger = isCurrentUserPassengerOfConfirmation()

    if (status === 'pending') {
      if (isOwner) {
        return true // Owner can't click main button when pending
      } else if (isPassenger) {
        return true // Passenger uses separate accept/reject buttons
      }
    } else if (status === 'accepted') {
      return true // Use separate cancel button
    }

    return false
  }

  const shouldShowAcceptRejectButtons = () => {
    return currentConfirmation && 
           currentConfirmation.status === 'pending' && 
           isCurrentUserPassengerOfConfirmation()
  }

  const shouldShowOwnerActionButtons = () => {
    return currentConfirmation && 
           currentConfirmation.status === 'pending' && 
           isCurrentUserOwnerOfConfirmation()
  }

  const shouldShowCancelButton = () => {
    return currentConfirmation && 
           currentConfirmation.status === 'accepted' && 
           (isCurrentUserOwnerOfConfirmation() || isCurrentUserPassengerOfConfirmation())
  }

  const shouldShowMainConfirmationButton = () => {
    if (!currentConfirmation) return true // Show request button
    
    const status = currentConfirmation.status
    if (status === 'rejected') return true // Show "Request Again" button
    if (status === 'pending') {
      // Only show for owner who initiated the request
      return isCurrentUserOwnerOfConfirmation()
    }
    if (status === 'accepted') return false // Use cancel button instead
    
    return false
  }

  const getDisclaimerContent = (type: string) => {
    const rideDetails = getRideOrTripDetails(preSelectedRide, preSelectedTrip)
    
    switch (type) {
      case 'passenger-request':
        return {
          title: 'Request Ride Confirmation',
          points: [
            'This will send a formal request to join this ride or trip',
            'The ride/trip owner will be notified and can accept or reject your request',
            'Make sure you have discussed the details in chat before sending',
            'Once accepted, you are committed to the agreed arrangements'
          ],
          explanation: `You are requesting to join the ${rideDetails}. Only send this when you are serious about joining.`
        }
      case 'owner-accept':
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
      case 'owner-reject':
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
      case 'cancel-confirmed':
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
      default:
        return {
          title: 'Confirm Action',
          points: ['Please confirm this action'],
          explanation: 'This action cannot be undone.'
        }
    }
  }

  // Mark messages as read when opening chat
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (user && otherUserId) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('sender_id', otherUserId)
          .eq('receiver_id', user.id)
      }
    }

    markMessagesAsRead()
  }, [user, otherUserId])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
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

  const getConfirmationButtonText = () => {
    const isPassengerRequest = (preSelectedRide && preSelectedRide.user_id !== user?.id) || 
                              (preSelectedTrip && preSelectedTrip.user_id !== user?.id)
    
    if (!isPassengerRequest) {
      return 'Send Ride Confirmation'
    }
    
    switch (currentConfirmationStatus) {
      case 'pending':
        return 'Request Pending...'
      case 'accepted':
        return 'Request Accepted ✓'
      case 'rejected':
        return 'Request Ride Again'
      default:
        return 'Request Ride Confirmation'
    }
  }

  const isConfirmationButtonDisabled = () => {
    const isPassengerRequest = (preSelectedRide && preSelectedRide.user_id !== user?.id) || 
                              (preSelectedTrip && preSelectedTrip.user_id !== user?.id)
    
    if (!isPassengerRequest) {
      return false
    }
    
    return currentConfirmationStatus === 'pending' || currentConfirmationStatus === 'accepted'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle size={48} className="text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-2 sm:p-4">
        <div className="container mx-auto max-w-full sm:max-w-xl md:max-w-4xl">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-1 sm:space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm sm:text-base"
            >
              <ArrowLeft size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-full">
                <span className="font-semibold text-xs sm:text-sm">
                  {otherUserName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate max-w-32 sm:max-w-none">{otherUserName}</h2>
                <p className="text-xs sm:text-sm text-gray-600">RideYaari User</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        <div className="container mx-auto max-w-full sm:max-w-xl md:max-w-4xl">
          <div className="bg-white rounded-2xl shadow-xl p-3 sm:p-6 h-full">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-64 sm:h-96">
                <div className="text-center">
                  <MessageCircle size={32} className="sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-4" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs sm:max-w-sm lg:max-w-md px-3 sm:px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : message.message_type === 'system' 
                            ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-bl-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}>
                        {message.message_type === 'system' && (
                          <div className="flex items-center space-x-1 mb-1">
                            <Clock size={12} className="text-yellow-600" />
                            <span className="text-xs font-medium text-yellow-600">System</span>
                          </div>
                        )}
                        <p className="text-xs sm:text-sm leading-relaxed">{message.message_content}</p>
                        
                        <p className={`text-xs mt-1 ${
                          isOwn ? 'text-blue-100' : 
                          message.message_type === 'system' ? 'text-yellow-600' : 'text-gray-500'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-2 sm:p-4">
        <div className="container mx-auto max-w-full sm:max-w-xl md:max-w-4xl">
          {/* Confirmation Button */}
          {(preSelectedRide || preSelectedTrip) && (
            <div className="mb-3 flex justify-center">
              <div className="flex flex-col items-center space-y-2">
                {/* Main confirmation button */}
                {shouldShowMainConfirmationButton() && (
                  <button
                    onClick={handlePassengerRequestConfirmation}
                    disabled={isConfirmationButtonDisabled()}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                      isConfirmationButtonDisabled()
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    <Check size={16} />
                    <span>{getConfirmationButtonText()}</span>
                  </button>
                )}

                {/* Accept/Reject buttons for passengers */}
                {shouldShowAcceptRejectButtons() && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleOwnerAcceptRequest}
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      <Check size={16} />
                      <span>Accept Offer</span>
                    </button>
                    <button
                      onClick={handleOwnerRejectRequest}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      <X size={16} />
                      <span>Decline Offer</span>
                    </button>
                  </div>
                )}

                {/* Owner action buttons */}
                {shouldShowOwnerActionButtons() && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleOwnerAcceptRequest}
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      <Check size={16} />
                      <span>Accept Request</span>
                    </button>
                    <button
                      onClick={handleOwnerRejectRequest}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      <X size={16} />
                      <span>Reject Request</span>
                    </button>
                  </div>
                )}

                {/* Cancel button for confirmed rides */}
                {shouldShowCancelButton() && (
                  <button
                    onClick={handleCancelConfirmedRide}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    <AlertTriangle size={16} />
                    <span>Cancel Ride</span>
                  </button>
                )}
              </div>
            </div>
          )}
          
          <form onSubmit={sendMessage} className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${otherUserName}...`}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                disabled={sending}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} className="sm:w-5 sm:h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Disclaimer Modals */}
      <DisclaimerModal
        isOpen={showPassengerRequestDisclaimer}
        onClose={() => setShowPassengerRequestDisclaimer(false)}
        onConfirm={handleConfirmPassengerRequest}
        loading={false}
        type="passenger-request"
        content={getDisclaimerContent('passenger-request')}
      />

      <DisclaimerModal
        isOpen={showOwnerAcceptDisclaimer}
        onClose={() => setShowOwnerAcceptDisclaimer(false)}
        onConfirm={handleConfirmOwnerAcceptRequest}
        loading={false}
        type="owner-accept"
        content={getDisclaimerContent('owner-accept')}
      />

      <DisclaimerModal
        isOpen={showOwnerRejectDisclaimer}
        onClose={() => setShowOwnerRejectDisclaimer(false)}
        onConfirm={handleConfirmOwnerRejectRequest}
        loading={false}
        type="owner-reject"
        content={getDisclaimerContent('owner-reject')}
      />

      <DisclaimerModal
        isOpen={showCancelConfirmedDisclaimer}
        onClose={() => setShowCancelConfirmedDisclaimer(false)}
        onConfirm={handleConfirmCancelConfirmedRide}
        loading={false}
        type="cancel-confirmed"
        content={getDisclaimerContent('cancel-confirmed')}
      />
    </div>
  )
}