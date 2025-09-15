import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, MessageCircle, Check, X, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { ChatMessage, RideConfirmation, CarRide, Trip } from '../types'
import RideConfirmationModal from './RideConfirmationModal'
import DisclaimerModal from './DisclaimerModal'
import { getCurrencySymbol } from '../utils/currencies'

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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showSendConfirmationDisclaimer, setShowSendConfirmationDisclaimer] = useState(false)
  const [currentConfirmationStatus, setCurrentConfirmationStatus] = useState<string | null>(null)
  const [existingConfirmationId, setExistingConfirmationId] = useState<string | null>(null)
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
            filter: `sender_id=eq.${otherUserId}`,
          },
          (payload) => {
            if (payload.new.receiver_id === user.id) {
              fetchMessages()
            }
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
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user, otherUserId])

  const fetchConfirmationStatus = async () => {
    if (!user || (!preSelectedRide && !preSelectedTrip)) return

    try {
      let query = supabase
        .from('ride_confirmations')
        .select('id, status')

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
        setCurrentConfirmationStatus(data.status)
        setExistingConfirmationId(data.id)
      } else {
        setCurrentConfirmationStatus(null)
        setExistingConfirmationId(null)
      }
    } catch (error) {
      console.error('Error fetching confirmation status:', error)
      setCurrentConfirmationStatus(null)
      setExistingConfirmationId(null)
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

  const handleShowConfirmationModal = () => {
    // Check if user is requesting confirmation for a pre-selected ride/trip
    const isPassengerRequest = (preSelectedRide && preSelectedRide.user_id !== user?.id) || 
                              (preSelectedTrip && preSelectedTrip.user_id !== user?.id)
    
    if (isPassengerRequest) {
      // Passenger requesting confirmation - show disclaimer first
      setShowSendConfirmationDisclaimer(true)
    } else {
      // Owner sending confirmation - show modal directly
      setShowConfirmationModal(true)
    }
  }

  const handleConfirmSendConfirmation = () => {
    setShowSendConfirmationDisclaimer(false)
    setShowConfirmationModal(true)
  }

  const handleConfirmationSubmit = async () => {
    if (!user) return

    try {
      // Determine if this is a passenger request or owner confirmation
      const isPassengerRequest = (preSelectedRide && preSelectedRide.user_id !== user?.id) || 
                                (preSelectedTrip && preSelectedTrip.user_id !== user?.id)
      
      let rideId = null
      let tripId = null
      let rideOwnerId = user.id
      let passengerId = otherUserId
      
      if (preSelectedRide) {
        rideId = preSelectedRide.id
        if (isPassengerRequest) {
          rideOwnerId = preSelectedRide.user_id
          passengerId = user.id
        }
      } else if (preSelectedTrip) {
        tripId = preSelectedTrip.id
        if (isPassengerRequest) {
          rideOwnerId = preSelectedTrip.user_id
          passengerId = user.id
        }
      }

      let error
      
      if (existingConfirmationId && currentConfirmationStatus === 'rejected') {
        // Update existing rejected confirmation to pending
        const result = await supabase
          .from('ride_confirmations')
          .update({
            status: 'pending',
            confirmed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfirmationId)
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

      // Send detailed system message with ride/trip information
      const rideType = rideId ? 'car ride' : 'airport trip'
      let rideDetails = ''
      
      if (preSelectedRide) {
        rideDetails = `\n📍 From: ${preSelectedRide.from_location}\n📍 To: ${preSelectedRide.to_location}\n🕐 Departure: ${new Date(preSelectedRide.departure_date_time).toLocaleString()}\n💰 Price: ${getCurrencySymbol(preSelectedRide.currency || 'USD')}${preSelectedRide.price} per person`
      } else if (preSelectedTrip) {
        rideDetails = `\n✈️ From: ${preSelectedTrip.leaving_airport}\n✈️ To: ${preSelectedTrip.destination_airport}\n📅 Date: ${new Date(preSelectedTrip.travel_date).toLocaleDateString()}`
        if (preSelectedTrip.departure_time) {
          rideDetails += `\n🕐 Departure: ${preSelectedTrip.departure_time}`
        }
        if (preSelectedTrip.landing_time) {
          rideDetails += `\n🛬 Arrival: ${preSelectedTrip.landing_time}`
        }
        if (preSelectedTrip.price) {
          rideDetails += `\n💰 Service Price: ${getCurrencySymbol(preSelectedTrip.currency || 'USD')}${preSelectedTrip.price}`
        }
      }
      
      const systemMessage = isPassengerRequest 
        ? `🚗 Ride confirmation request sent for the ${rideType}:${rideDetails}\n\nThe ride owner can accept/reject this request in their confirmations tab or here in chat.`
        : `🚗 New ride confirmation request received for your ${rideType}:${rideDetails}\n\nYou can accept/reject this request in your confirmations tab or use the buttons below.`
      
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: isPassengerRequest ? user.id : user.id,
          receiver_id: isPassengerRequest ? rideOwnerId : passengerId,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      setShowConfirmationModal(false)
      fetchMessages()
      fetchConfirmationStatus()
    } catch (error: any) {
      console.error('Error creating confirmation:', error)
      alert('Failed to send confirmation request. Please try again.')
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
              <button
                onClick={handleShowConfirmationModal}
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

      <RideConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmationSubmit}
        passengerName={otherUserName}
        preSelectedRide={preSelectedRide}
        preSelectedTrip={preSelectedTrip}
      />

      <DisclaimerModal
        isOpen={showSendConfirmationDisclaimer}
        onClose={() => setShowSendConfirmationDisclaimer(false)}
        onConfirm={handleConfirmSendConfirmation}
        loading={false}
        type="ride-confirmation"
        content={{
          title: 'Request Ride Confirmation',
          points: [
            'This will send a formal request to join this ride or trip',
            'The ride/trip owner will be notified and can accept or reject your request',
            'You can only send one confirmation request per ride or trip',
            'Make sure you have discussed the details in chat before sending',
            'Once accepted, you are committed to the agreed arrangements',
            'Canceling after acceptance may affect your reputation on the platform'
          ],
          explanation: 'A ride confirmation request is a formal way to request a spot in this ride or trip. Only send this when you are serious about joining and have agreed on the details.'
        }}
      />
    </div>
  )
}