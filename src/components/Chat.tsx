import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, MessageCircle, Check, X, Clock, AlertTriangle, MoreVertical, Shield, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ChatMessage, RideConfirmation, CarRide, Trip } from '../types'
import RideConfirmationModal from './RideConfirmationModal'
import DisclaimerModal from './DisclaimerModal'
import EnhancedSystemMessage from './EnhancedSystemMessage'
import ChatBlockingControls from './ChatBlockingControls'
import { useConfirmationFlow } from '../hooks/useConfirmationFlow'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import { isUserBlocked, isChatDeleted } from '../utils/blockingHelpers'
import { supabase } from '../utils/supabase'

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
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentConfirmation, setCurrentConfirmation] = useState<RideConfirmation | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { error: chatError, handleAsync, clearError } = useErrorHandler()
  const [showChatOptions, setShowChatOptions] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [chatDeleted, setChatDeleted] = useState(false)
  const [expiredMessageIds, setExpiredMessageIds] = useState<Set<string>>(new Set())
  const { 
    error: confirmationError,
    isLoading: confirmationLoading,
    confirmationState,
    showDisclaimer,
    hideDisclaimer,
    createConfirmation,
    acceptRequest,
    rejectRequest,
    cancelConfirmation,
    requestAgain
  } = useConfirmationFlow({
    onUpdate: () => {
      fetchConfirmationStatus()
      fetchMessages()
    }
  })

  // Helper function to determine message type from content
  const getMessageTypeFromContent = (content: string): 'request' | 'offer' | 'accept' | 'reject' | 'cancel' | 'system' => {
    if (content.includes('requested to join') || content.includes('new request')) return 'request'
    if (content.includes('sent a ride offer') || content.includes('ride offer')) return 'offer'
    if (content.includes('ACCEPTED') || content.includes('accepted')) return 'accept'
    if (content.includes('declined') || content.includes('rejected')) return 'reject'
    if (content.includes('cancelled')) return 'cancel'
    return 'system'
  }
  useEffect(() => {
    if (user) {
      fetchMessages()
      fetchConfirmationStatus()
      checkBlockingStatus()
      
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

  const checkBlockingStatus = async () => {
    if (!user) return

    try {
      console.log('Checking blocking status between:', user.id, 'and', otherUserId)
      const [blocked, deleted] = await Promise.all([
        isUserBlocked(user.id, otherUserId),
        isChatDeleted(user.id, otherUserId)
      ])
      
      console.log('Blocking status result:', { blocked, deleted })
      setIsBlocked(blocked)
      setChatDeleted(deleted)
    } catch (error) {
      console.error('Error checking blocking status:', error)
      // Don't block chat if there's an error checking blocking status
      setIsBlocked(false)
      setChatDeleted(false)
    }
  }

  const handleMessageExpire = (messageId: string) => {
    setExpiredMessageIds(prev => new Set([...prev, messageId]))
  }

  const handleChatBlocked = () => {
    setIsBlocked(true)
    setShowChatOptions(false)
  }

  const handleChatUnblocked = () => {
    setIsBlocked(false)
    setShowChatOptions(false)
  }

  const handleChatDeleted = () => {
    setChatDeleted(true)
    setShowChatOptions(false)
  }

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

  const fetchConfirmationStatus = async () => {
    if (!user || (!preSelectedRide && !preSelectedTrip)) return
    
    await handleAsync(async () => {
      // Dynamically construct the select statement based on ride or trip
      let selectStatement = `
        *,
        user_profiles!ride_confirmations_passenger_id_fkey (
          id,
          full_name
        )`
      
      if (preSelectedRide) {
        selectStatement += `,
        car_rides!ride_confirmations_ride_id_fkey (
          id,
          from_location,
          to_location,
          departure_date_time,
          price,
          currency,
          user_id
        )`
      } else if (preSelectedTrip) {
        selectStatement += `,
        trips!ride_confirmations_trip_id_fkey (
          id,
          leaving_airport,
          destination_airport,
          travel_date,
          price,
          currency,
          user_id
        )`
      }

      let query = supabase
        .from('ride_confirmations')
        .select(selectStatement)

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
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    if (!user) return

    console.log('Fetching messages between:', user.id, 'and', otherUserId)

    await handleAsync(async () => {
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

      console.log('Messages fetch result:', { data: data?.length, error })
      if (!error && data) {
        // Filter out expired messages and deleted conversations
        const filteredMessages = data.filter(message => {
          // Don't show expired messages
          if (expiredMessageIds.has(message.id)) {
            return false
          }
          
          // Auto-expire reject/cancel system messages after 10 minutes
          if (message.message_type === 'system') {
            const messageTime = new Date(message.created_at)
            const now = new Date()
            const minutesSinceMessage = (now.getTime() - messageTime.getTime()) / (1000 * 60)
            
            const messageContent = message.message_content.toLowerCase()
            if ((messageContent.includes('declined') || messageContent.includes('cancelled')) && minutesSinceMessage >= 10) {
              setExpiredMessageIds(prev => new Set([...prev, message.id]))
              return false
            }
          }
          
          return true
        })
        
        setMessages(filteredMessages)
      }
      
      setMessagesLoading(false)
    })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || sending || isBlocked) return

    setSending(true)

    await handleAsync(async () => {
      console.log('Sending message from:', user.id, 'to:', otherUserId)

      // Restore chat if it was deleted (when user sends a new message)
      if (chatDeleted) {
        console.log('Restoring deleted chat by sending new message')
        await supabase
          .from('chat_deletions')
          .delete()
          .eq('user_id', user.id)
          .eq('other_user_id', otherUserId)
        
        setChatDeleted(false)
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          message_content: newMessage.trim(),
          is_read: false,
        })

      console.log('Message insert result:', { error })
      if (error) throw error

      setNewMessage('')
      fetchMessages()
    }).finally(() => {
      setSending(false)
    })
  }

  const handlePassengerRequestConfirmation = () => {
    if (!user) return
    showDisclaimer('passenger-request')
  }

  const handleConfirmPassengerRequest = async () => {
    if (!user) return

    hideDisclaimer()

    await handleAsync(async () => {
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

      if (currentConfirmation && currentConfirmation.status === 'rejected') {
        // Update existing rejected confirmation to pending
        const { error } = await supabase
          .from('ride_confirmations')
          .update({
            status: 'pending',
            confirmed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentConfirmation.id)
        
        if (error) throw error
      } else {
        // Insert new confirmation
        await createConfirmation(rideId, tripId, rideOwnerId, passengerId)
      }

      fetchMessages()
      fetchConfirmationStatus()
    })
  }

  const handleOwnerAcceptRequest = () => {
    showDisclaimer('owner-accept')
  }

  const handleConfirmOwnerAcceptRequest = async () => {
    if (!user) return

    if (!currentConfirmation) {
      alert('No confirmation found to accept.')
      return
    }
    
    hideDisclaimer()
    await acceptRequest(currentConfirmation.id, user.id, currentConfirmation.passenger_id)
  }

  const handleOwnerRejectRequest = () => {
    showDisclaimer('owner-reject')
  }

  const handleConfirmOwnerRejectRequest = async () => {
    if (!user) return

    if (!currentConfirmation) {
      alert('No confirmation found to reject.')
      return
    }
    
    hideDisclaimer()
    await rejectRequest(currentConfirmation.id, user.id, currentConfirmation.passenger_id)
  }

  const handleCancelConfirmedRide = () => {
    showDisclaimer('cancel-confirmed')
  }

  const handleConfirmCancelConfirmedRide = async () => {
    if (!user) return

    if (!currentConfirmation) {
      alert('No confirmation found to cancel.')
      return
    }
    
    hideDisclaimer()
    const isOwner = isCurrentUserOwnerOfConfirmation()
    await cancelConfirmation(
      currentConfirmation.id,
      user.id,
      isOwner,
      preSelectedRide,
      preSelectedTrip
    )
  }

  const handleRequestAgain = async () => {
    if (!user || !currentConfirmation) return
    
    await handleAsync(async () => {
      await requestAgain(
        currentConfirmation.id,
        user.id,
        currentConfirmation.ride_owner_id,
        preSelectedRide,
        preSelectedTrip
      )
    })
  }

  const getConfirmationButtonText = () => {
    if (!currentConfirmation) {
      // No confirmation exists - show request button
      return 'Request Ride Confirmation'
    }

    const status = currentConfirmation.status
    const isPassenger = isCurrentUserPassengerOfConfirmation()

    if (status === 'pending') {
      return 'Request Pending - Awaiting Response'
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

    if (status === 'pending') {
      return true // Button disabled when pending
    } else if (status === 'accepted') {
      return true // Use separate cancel button
    }

    return false
  }

  const shouldShowCancelButton = () => {
    // Only show if we have a confirmation, it's accepted, user is involved, and we have preselected ride/trip
    return currentConfirmation && 
           currentConfirmation.status === 'accepted' && 
           (isCurrentUserOwnerOfConfirmation() || isCurrentUserPassengerOfConfirmation()) &&
           (preSelectedRide || preSelectedTrip)
  }

  const shouldShowMainConfirmationButton = () => {
    if (!currentConfirmation) {
      // Only show request button if not the owner and we have a preselected ride/trip
      return !isCurrentUserOwnerOfPreselected() && (preSelectedRide || preSelectedTrip)
    }
    
    const status = currentConfirmation.status
    if (status === 'rejected') return true // Show "Request Again" button
    if (status === 'pending') return false // Hide when pending (handled by dedicated UI)
    if (status === 'accepted') return false // Use cancel button instead
    
    return false
  }

  const shouldShowRequestAgainButton = () => {
    // Only show if we have a confirmation, it's rejected, user is passenger, and we have preselected ride/trip
    return currentConfirmation && 
           currentConfirmation.status === 'rejected' && 
           isCurrentUserPassengerOfConfirmation() &&
           (preSelectedRide || preSelectedTrip)
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
      if (user && otherUserId && !isBlocked && !chatDeleted) {
        console.log('Marking messages as read for chat between:', user.id, 'and', otherUserId)
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .eq('sender_id', otherUserId)
          .eq('receiver_id', user.id)
      }
    }

    markMessagesAsRead()
  }, [user, otherUserId, isBlocked, chatDeleted])

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

  if (messagesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading conversation..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-2 sm:p-4">
        <div className="container mx-auto max-w-full sm:max-w-xl md:max-w-4xl">
          {(chatError || confirmationError) && (
            <ErrorMessage
              message={chatError || confirmationError || ''}
              onDismiss={() => {
                clearError()
                if (confirmationError) {
                  // Clear confirmation error through the hook
                }
              }}
              className="mb-4"
            />
          )}
          
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
            
            {/* Chat Options */}
            <div className="relative">
              <button
                onClick={() => setShowChatOptions(!showChatOptions)}
                className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              
              {showChatOptions && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                  <div className="p-2">
                    <ChatBlockingControls
                      otherUserId={otherUserId}
                      otherUserName={otherUserName}
                      onBlock={handleChatBlocked}
                      onUnblock={handleChatUnblocked}
                      onDeleteChat={handleChatDeleted}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Blocking/Deletion Status */}
      {(isBlocked || chatDeleted) && (
        <div className="bg-red-50 border border-red-200 p-4">
          <div className="flex items-center space-x-3">
            <Shield size={20} className="text-red-600" />
            <div>
              <h4 className="font-semibold text-red-900">
                {isBlocked ? 'User Blocked' : 'Chat Deleted'}
              </h4>
              <p className="text-sm text-red-800">
                {isBlocked 
                  ? 'You have blocked this user. They cannot send you messages.'
                  : 'You have deleted this conversation. It will be hidden from your messages.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

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
                      {message.message_type === 'system' ? (
                        <div className="w-full max-w-md mx-auto">
                          <EnhancedSystemMessage
                            message={message.message_content}
                            timestamp={message.created_at}
                            type={getMessageTypeFromContent(message.message_content)}
                            rideType={preSelectedRide ? 'car' : 'airport'}
                            onExpire={() => handleMessageExpire(message.id)}
                          />
                        </div>
                      ) : (
                        <div className={`max-w-xs sm:max-w-sm lg:max-w-md px-3 sm:px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}>
                          <p className="text-xs sm:text-sm leading-relaxed">{message.message_content}</p>
                          
                          <p className={`text-xs mt-1 ${
                            isOwn ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      )}
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
          {confirmationLoading && (
            <div className="mb-4 flex justify-center">
              <LoadingSpinner text="Processing confirmation..." />
            </div>
          )}
          
          {/* Passenger Pending Request Message */}
          {currentConfirmation && 
           currentConfirmation.status === 'pending' && 
           isCurrentUserPassengerOfConfirmation() && 
           (preSelectedRide || preSelectedTrip) && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock size={16} className="text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-900">Request Pending</h4>
                  <p className="text-sm text-yellow-800">
                    You requested a ride and it's waiting for approval.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Owner Pending Request Actions */}
          {currentConfirmation && 
           currentConfirmation.status === 'pending' && 
           isCurrentUserOwnerOfConfirmation() && 
           (preSelectedRide || preSelectedTrip) && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <AlertTriangle size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">Action Required</h4>
                    <p className="text-sm text-blue-800">
                      Passenger {currentConfirmation.user_profiles?.full_name || 'Unknown'} is requesting, you need to approve.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleOwnerRejectRequest}
                    disabled={confirmationLoading}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={handleOwnerAcceptRequest}
                    disabled={confirmationLoading}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                  >
                    <Check size={14} />
                    <span>Accept</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Passenger Accepted Message */}
          {currentConfirmation && 
           currentConfirmation.status === 'accepted' && 
           isCurrentUserPassengerOfConfirmation() && 
           (preSelectedRide || preSelectedTrip) && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Check size={16} className="text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">Request Approved!</h4>
                  <p className="text-sm text-green-800">
                    Your request was approved! You are confirmed for this ride.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Passenger Rejected Message */}
          {currentConfirmation && 
           currentConfirmation.status === 'rejected' && 
           isCurrentUserPassengerOfConfirmation() && 
           (preSelectedRide || preSelectedTrip) && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <X size={16} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-900">Request Declined</h4>
                  <p className="text-sm text-red-800">
                    Your request was declined.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Passenger Cancelled Message */}
          {currentConfirmation && 
           currentConfirmation.status === 'rejected' && 
           isCurrentUserPassengerOfConfirmation() && (
            <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={16} className="text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-orange-900">Ride Cancelled</h4>
                  <p className="text-sm text-orange-800">
                    The ride was cancelled by the driver.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Button */}
          {(preSelectedRide || preSelectedTrip) && !isBlocked && (
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

                {/* Cancel button for confirmed rides */}
                {shouldShowCancelButton() && (
                  <button
                    onClick={handleCancelConfirmedRide}
                    disabled={confirmationLoading}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
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
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base ${
                  isBlocked ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                disabled={sending || isBlocked}
                placeholder={isBlocked ? 'Cannot message blocked user' : `Message ${otherUserName}...`}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || isBlocked}
              className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isBlocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Send size={16} className="sm:w-5 sm:h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Disclaimer Modals */}
      <DisclaimerModal
        isOpen={confirmationState.showDisclaimer && confirmationState.disclaimerType === 'passenger-request'}
        onClose={hideDisclaimer}
        onConfirm={handleConfirmPassengerRequest}
        loading={confirmationLoading}
        type="passenger-request"
      />

      <DisclaimerModal
        isOpen={confirmationState.showDisclaimer && confirmationState.disclaimerType === 'owner-accept'}
        onClose={hideDisclaimer}
        onConfirm={handleConfirmOwnerAcceptRequest}
        loading={confirmationLoading}
        type="owner-accept"
      />

      <DisclaimerModal
        isOpen={confirmationState.showDisclaimer && confirmationState.disclaimerType === 'owner-reject'}
        onClose={hideDisclaimer}
        onConfirm={handleConfirmOwnerRejectRequest}
        loading={confirmationLoading}
        type="owner-reject"
      />

      <DisclaimerModal
        isOpen={confirmationState.showDisclaimer && confirmationState.disclaimerType === 'cancel-confirmed'}
        onClose={hideDisclaimer}
        onConfirm={handleConfirmCancelConfirmedRide}
        loading={confirmationLoading}
        type="cancel-confirmed"
      />
    </div>
  )
}