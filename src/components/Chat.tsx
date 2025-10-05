import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, User, Plane, Car, Shield, Trash2, TriangleAlert as AlertTriangle, MessageCircle, X, Clock, CircleCheck as CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { ChatMessage, CarRide, Trip } from '../types'
import DisclaimerModal from './DisclaimerModal'
import ChatBlockingControls from './ChatBlockingControls'
import RideRequestModal from './RideRequestModal'
import TripRequestModal from './TripRequestModal'
import { popupManager } from '../utils/popupManager'
import { isUserBlocked, isChatDeleted } from '../utils/blockingHelpers'
import { formatDateTimeSafe } from '../utils/dateHelpers'
import { cleanupOldSystemMessages } from '../utils/confirmationHelpers'

interface ChatProps {
  onBack: () => void
  otherUserId: string
  otherUserName: string
  preSelectedRide?: CarRide
  preSelectedTrip?: Trip
}

export default function Chat({ onBack, otherUserId, otherUserName, preSelectedRide, preSelectedTrip }: ChatProps) {
  const { user, userProfile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [chatDeleted, setChatDeleted] = useState(false)
  const [skipLoading, setSkipLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null)
  const subscriptionRef = useRef<any>(null)
  const [showRideRequestModal, setShowRideRequestModal] = useState(false)
  const [showTripRequestModal, setShowTripRequestModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!user || !otherUserId || !otherUserId.trim()) {
      console.error('Chat: Missing required data:', { user: !!user, otherUserId })
      return
    }

    console.log('Chat: Starting to load chat data for users:', user.id, 'and', otherUserId)

    const timeout = setTimeout(() => {
      console.log('Chat: Loading timeout reached, showing skip option')
      setLoadingTimeout(timeout)
    }, 10000)

    // Clean up old system messages on mount
    cleanupOldSystemMessages().catch(err =>
      console.warn('Chat: Failed to cleanup old system messages:', err)
    )

    initializeChat()

    return () => {
      if (timeout) clearTimeout(timeout)
      if (loadingTimeout) clearTimeout(loadingTimeout)
      if (subscriptionRef.current) {
        console.log('Chat: Cleaning up subscription on unmount')
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [user, otherUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeChat = async () => {
    if (!user || !otherUserId || !otherUserId.trim()) {
      setError('Invalid user information')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setMessages([])
    setIsBlocked(false)
    setChatDeleted(false)

    try {
      console.log('Chat: Initializing chat between', user.id, 'and', otherUserId)

      // Check blocking status
      const blocked = await isUserBlocked(user.id, otherUserId)
      console.log('Chat: Blocking check result:', blocked)
      setIsBlocked(blocked)
      if (blocked) {
        setLoading(false)
        return
      }

      // Check chat deletion status
      const deleted = await isChatDeleted(user.id, otherUserId)
      console.log('Chat: Deletion check result:', deleted)
      setChatDeleted(deleted)
      if (deleted) {
        setLoading(false)
        return
      }

      // Fetch other user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', otherUserId)
        .maybeSingle()

      if (profileError) {
        console.warn('Chat: Profile fetch error:', profileError)
      }

      setOtherUserProfile(profile || {
        id: otherUserId,
        full_name: otherUserName || 'User',
        profile_image_url: null
      })

      // Fetch messages
      await fetchMessages()

      // Set up real-time subscription
      setupRealtimeSubscription()

    } catch (error: any) {
      console.error('Chat: Error initializing chat:', error)
      setError('Failed to load chat. Please try again.')
    } finally {
      setLoading(false)
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
        setLoadingTimeout(null)
      }
    }
  }

  const fetchMessages = async () => {
    if (!user || !otherUserId || !otherUserId.trim()) {
      console.error('Chat: Cannot fetch messages - missing user data')
      return
    }

    try {
      console.log('Chat: Fetching messages between', user.id, 'and', otherUserId)

      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:user_profiles!chat_messages_sender_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        console.error('Chat: Error fetching messages:', error)
        throw error
      }

      console.log('Chat: Fetched', data?.length || 0, 'messages')
      setMessages(data || [])

      // Mark messages as read
      if (data && data.length > 0) {
        const unreadMessages = data.filter((msg: ChatMessage) =>
          msg.receiver_id === user.id && !msg.is_read
        )

        if (unreadMessages.length > 0) {
          console.log('Chat: Marking', unreadMessages.length, 'messages as read')
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .eq('receiver_id', user.id)
            .eq('sender_id', otherUserId)
            .eq('is_read', false)
        }
      }
    } catch (error: any) {
      console.error('Chat: Error in fetchMessages:', error)
      setError('Failed to load messages. Please try again.')
      setMessages([])
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user || !otherUserId) return

    // Clean up existing subscription first
    if (subscriptionRef.current) {
      console.log('Chat: Cleaning up existing subscription')
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }

    console.log('Chat: Setting up realtime subscription')

    const subscription = supabase
      .channel(`chat_${user.id}_${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id}))`,
        },
        (payload) => {
          console.log('Chat: New message received via realtime:', payload)
          const newMessage = payload.new as ChatMessage

          // Add sender profile info if available
          if (newMessage.sender_id === user.id) {
            newMessage.sender = userProfile || undefined
          } else {
            newMessage.sender = otherUserProfile || undefined
          }

          setMessages(prev => [...prev, newMessage])

          // Mark as read if it's for the current user
          if (newMessage.receiver_id === user.id) {
            supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMessage.id)
              .then(() => console.log('Chat: Message marked as read'))
              .catch(err => console.warn('Chat: Failed to mark message as read:', err))
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat: Subscription status:', status)
      })

    subscriptionRef.current = subscription
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || sending) return

    // Check if disclaimer should be shown
    const disclaimerType = preSelectedRide ? 'chat-ride' : 'chat-trip'
    if (popupManager.shouldShowDisclaimer(disclaimerType, user.id, otherUserId)) {
      setShowDisclaimer(true)
      return
    }

    await sendMessage()
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return

    setSending(true)
    setError('')

    try {
      console.log('Chat: Sending message to', otherUserId)
      
      const messageData = {
        sender_id: user.id,
        receiver_id: otherUserId,
        message_content: newMessage.trim(),
        message_type: 'user' as const,
        is_read: false
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select(`
          *,
          sender:user_profiles!chat_messages_sender_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .single()

      if (error) {
        console.error('Chat: Error sending message:', error)
        throw error
      }

      console.log('Chat: Message sent successfully')
      setNewMessage('')
      
      // The message will be added via realtime subscription
      // But add it immediately for better UX
      if (data) {
        setMessages(prev => [...prev, data])
      }
    } catch (error: any) {
      console.error('Chat: Error sending message:', error)
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleConfirmSend = () => {
    setShowDisclaimer(false)
    const disclaimerType = preSelectedRide ? 'chat-ride' : 'chat-trip'
    popupManager.markDisclaimerShown(disclaimerType, user?.id, otherUserId)
    sendMessage()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatMessageTime = (dateString: string) => {
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

  const handleSkipLoading = () => {
    console.log('Chat: User chose to skip loading')
    setLoading(false)
    setSkipLoading(true)
    if (loadingTimeout) {
      clearTimeout(loadingTimeout)
      setLoadingTimeout(null)
    }
  }

  const handleRetryLoading = () => {
    console.log('Chat: User chose to retry loading')
    setSkipLoading(false)
    setError('')
    setLoading(true)
    initializeChat()
  }

  const handleRideRequestSubmit = async (rideId: string, seatsRequested: number) => {
    if (!user) return

    try {
      const { data: existingConfirmations } = await supabase
        .from('ride_confirmations')
        .select('id, status, updated_at')
        .eq('ride_id', rideId)
        .eq('passenger_id', user.id)
        .order('updated_at', { ascending: false })

      if (existingConfirmations && existingConfirmations.length > 0) {
        const latest = existingConfirmations[0]

        if (latest.status === 'pending') {
          alert('You already have a pending request for this ride. You cannot send another request until it is accepted or rejected.')
          setShowRideRequestModal(false)
          return
        } else if (latest.status === 'accepted') {
          throw new Error('You have already been accepted for this ride')
        } else if (latest.status === 'rejected') {
          const rejectedTime = new Date(latest.updated_at).getTime()
          const now = new Date().getTime()
          const timeDiff = now - rejectedTime
          const cooldownPeriod = 10 * 60 * 1000

          if (timeDiff < cooldownPeriod) {
            const remainingMinutes = Math.ceil((cooldownPeriod - timeDiff) / (60 * 1000))
            setError(`Please wait ${remainingMinutes} more minute${remainingMinutes > 1 ? 's' : ''} before requesting this ride again`)
            return
          }

          // Instead of deleting, update the existing rejected confirmation to pending
          const { error: updateError } = await supabase
            .from('ride_confirmations')
            .update({ 
              status: 'pending',
              seats_requested: seatsRequested,
              updated_at: new Date().toISOString()
            })
            .eq('ride_id', rideId)
            .eq('passenger_id', user.id)
            .eq('status', 'rejected')

          if (updateError) {
            console.error('Error updating confirmation:', updateError)
            throw new Error('Failed to resubmit request')
          }

          // Skip the insert since we updated the existing record
          const { data: rideData } = await supabase
            .from('car_rides')
            .select('*')
            .eq('id', rideId)
            .maybeSingle()

          if (!rideData) {
            throw new Error('Ride not found')
          }

          const passengerName = userProfile?.full_name || 'A passenger'
          const rideDetails = `${rideData.from_location} → ${rideData.to_location}`

          await supabase
            .from('chat_messages')
            .insert({
              sender_id: user.id,
              receiver_id: otherUserId,
              message_content: `🚗 ${passengerName} has requested ${seatsRequested} seat${seatsRequested > 1 ? 's' : ''} for your ride (${rideDetails}). Please review and respond in your Confirmations tab.`,
              message_type: 'system',
              is_read: false
            })

          setShowRideRequestModal(false)
          setSuccessMessage('Request sent successfully! You can view and manage this confirmation in your Confirmations tab. Please wait for the driver to respond.')
          setShowSuccessModal(true)
          return
        }
      }

      const { data: rideData } = await supabase
        .from('car_rides')
        .select('*')
        .eq('id', rideId)
        .maybeSingle()

      if (!rideData) {
        throw new Error('Ride not found')
      }

      const { error: insertError } = await supabase
        .from('ride_confirmations')
        .insert({
          ride_id: rideId,
          ride_owner_id: otherUserId,
          passenger_id: user.id,
          seats_requested: seatsRequested,
          status: 'pending'
        })

      if (insertError) throw insertError

      const passengerName = userProfile?.full_name || 'A passenger'
      const rideDetails = `${rideData.from_location} → ${rideData.to_location}`

      await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          message_content: `🚗 ${passengerName} has requested ${seatsRequested} seat${seatsRequested > 1 ? 's' : ''} for your ride (${rideDetails}). Please review and respond in your Confirmations tab.`,
          message_type: 'system',
          is_read: false
        })

      setShowRideRequestModal(false)
      setSuccessMessage('Request sent successfully! You can view and manage this confirmation in your Confirmations tab. Please wait for the driver to respond.')
      setShowSuccessModal(true)
    } catch (error: any) {
      console.error('Error submitting ride request:', error)
      setError(error.message || 'Failed to submit ride request')
      throw error
    }
  }

  const handleTripRequestSubmit = async (tripId: string) => {
    if (!user) return

    try {
      const { data: existingConfirmations } = await supabase
        .from('ride_confirmations')
        .select('id, status, updated_at')
        .eq('trip_id', tripId)
        .eq('passenger_id', user.id)
        .order('updated_at', { ascending: false })

      if (existingConfirmations && existingConfirmations.length > 0) {
        const latest = existingConfirmations[0]

        if (latest.status === 'pending') {
          alert('You already have a pending request for this trip. You cannot send another request until it is accepted or rejected.')
          setShowTripRequestModal(false)
          return
        } else if (latest.status === 'accepted') {
          throw new Error('You have already been accepted for this trip')
        } else if (latest.status === 'rejected') {
          const rejectedTime = new Date(latest.updated_at).getTime()
          const now = new Date().getTime()
          const timeDiff = now - rejectedTime
          const cooldownPeriod = 10 * 60 * 1000

          if (timeDiff < cooldownPeriod) {
            const remainingMinutes = Math.ceil((cooldownPeriod - timeDiff) / (60 * 1000))
            setError(`Please wait ${remainingMinutes} more minute${remainingMinutes > 1 ? 's' : ''} before requesting this trip again`)
            return
          }

          // Instead of deleting, update the existing rejected confirmation to pending
          const { error: updateError } = await supabase
            .from('ride_confirmations')
            .update({ 
              status: 'pending',
              updated_at: new Date().toISOString()
            })
            .eq('trip_id', tripId)
            .eq('passenger_id', user.id)
            .eq('status', 'rejected')

          if (updateError) {
            console.error('Error updating confirmation:', updateError)
            throw new Error('Failed to resubmit request')
          }

          // Skip the insert since we updated the existing record
          const { data: tripData } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .maybeSingle()

          if (!tripData) {
            throw new Error('Trip not found')
          }

          const passengerName = userProfile?.full_name || 'A passenger'
          const tripDetails = `${tripData.leaving_airport} → ${tripData.destination_airport}`

          await supabase
            .from('chat_messages')
            .insert({
              sender_id: user.id,
              receiver_id: otherUserId,
              message_content: `✈️ ${passengerName} has requested to join your airport trip (${tripDetails}). Please review and respond in your Confirmations tab.`,
              message_type: 'system',
              is_read: false
            })

          setShowTripRequestModal(false)
          setSuccessMessage('Request sent successfully! You can view and manage this confirmation in your Confirmations tab. Please wait for the traveler to respond.')
          setShowSuccessModal(true)
          return
        }
      }

      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle()

      if (!tripData) {
        throw new Error('Trip not found')
      }

      const { error: insertError } = await supabase
        .from('ride_confirmations')
        .insert({
          trip_id: tripId,
          ride_owner_id: otherUserId,
          passenger_id: user.id,
          status: 'pending'
        })

      if (insertError) throw insertError

      const passengerName = userProfile?.full_name || 'A passenger'
      const tripDetails = `${tripData.leaving_airport} → ${tripData.destination_airport}`

      await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          message_content: `✈️ ${passengerName} has requested to join your airport trip (${tripDetails}). Please review and respond in your Confirmations tab.`,
          message_type: 'system',
          is_read: false
        })

      setShowTripRequestModal(false)
      setSuccessMessage('Request sent successfully! You can view and manage this confirmation in your Confirmations tab. Please wait for the traveler to respond.')
      setShowSuccessModal(true)
    } catch (error: any) {
      console.error('Error submitting trip request:', error)
      setError(error.message || 'Failed to submit trip request')
      throw error
    }
  }

  if (loading && !skipLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading conversation...</h3>
          <p className="text-gray-600 mb-4">Loading chat history...</p>
          
          {loadingTimeout && (
            <div className="space-y-3">
              <button
                onClick={handleSkipLoading}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Skip loading (if taking too long)
              </button>
              <p className="text-xs text-gray-500">
                You can start chatting even if the history hasn't loaded yet
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error && !skipLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetryLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleSkipLoading}
              className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Continue Without History
            </button>
            <button
              onClick={onBack}
              className="w-full text-gray-600 hover:text-gray-700 font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <Shield size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">User Blocked</h3>
          <p className="text-gray-600 mb-6">
            You have blocked this user. Unblock them to start chatting again.
          </p>
          <button
            onClick={onBack}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (chatDeleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <Trash2 size={48} className="text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Deleted</h3>
          <p className="text-gray-600 mb-6">
            You have deleted this conversation. Start a new conversation by sending a message.
          </p>
          <button
            onClick={onBack}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                {otherUserProfile?.profile_image_url ? (
                  <img
                    src={otherUserProfile.profile_image_url}
                    alt={otherUserProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold">
                    {(otherUserProfile?.full_name || otherUserName || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {otherUserProfile?.full_name || otherUserName || 'User'}
                </h2>
                <p className="text-sm text-gray-600">
                  {skipLoading ? 'Chat (history skipped)' : `${messages.length} messages`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ChatBlockingControls
              otherUserId={otherUserId}
              otherUserName={otherUserProfile?.full_name || otherUserName || 'User'}
              onBlock={() => {
                setIsBlocked(true)
              }}
              onDeleteChat={() => {
                setChatDeleted(true)
                onBack()
              }}
            />
          </div>
        </div>

        {/* Ride/Trip Context */}
        {(preSelectedRide || preSelectedTrip) && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              {preSelectedRide ? (
                <Car size={20} className="text-green-600" />
              ) : (
                <Plane size={20} className="text-blue-600" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {preSelectedRide ? 'Car Ride' : 'Airport Trip'}
                </h3>
                <p className="text-sm text-gray-600">
                  {preSelectedRide
                    ? `${preSelectedRide.from_location} → ${preSelectedRide.to_location}`
                    : `${preSelectedTrip?.leaving_airport} → ${preSelectedTrip?.destination_airport}`
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {preSelectedRide
                    ? formatDateTimeSafe(preSelectedRide.departure_date_time)
                    : preSelectedTrip ? formatDateTimeSafe(preSelectedTrip.travel_date) : ''
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {skipLoading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock size={16} className="text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Chat history was skipped due to slow loading
                </span>
              </div>
              <button
                onClick={handleRetryLoading}
                className="text-yellow-700 hover:text-yellow-800 font-medium text-sm"
              >
                Load History
              </button>
            </div>
          </div>
        )}

        {messages.length === 0 && !loading && !skipLoading ? (
          <div className="text-center py-12">
            <MessageCircle size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start the conversation</h3>
            <p className="text-gray-600">
              Send a message to {otherUserProfile?.full_name || otherUserName || 'this user'} to begin your chat
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.message_type === 'system'
                    ? 'bg-yellow-100 border border-yellow-200 text-yellow-800 mx-auto text-center'
                    : message.sender_id === user?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {message.message_type === 'system' && (
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <span className="font-semibold text-xs">SYSTEM MESSAGE</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{message.message_content}</p>
                <p className={`text-xs mt-1 ${
                  message.message_type === 'system'
                    ? 'text-yellow-600'
                    : message.sender_id === user?.id
                    ? 'text-blue-200'
                    : 'text-gray-500'
                }`}>
                  {formatMessageTime(message.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4 pb-24">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Request Buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setShowRideRequestModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors border border-green-200"
          >
            <Car size={18} />
            <span>Request Ride</span>
          </button>
          <button
            onClick={() => setShowTripRequestModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors border border-blue-200"
          >
            <Plane size={18} />
            <span>Request Trip</span>
          </button>
        </div>

        <form onSubmit={handleSendMessage} className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${otherUserProfile?.full_name || otherUserName || 'user'}...`}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </div>
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>

      <DisclaimerModal
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
        onConfirm={handleConfirmSend}
        loading={sending}
        type={preSelectedRide ? 'chat-ride' : 'chat-trip'}
      />

      <RideRequestModal
        isOpen={showRideRequestModal}
        onClose={() => setShowRideRequestModal(false)}
        driverId={otherUserId}
        driverName={otherUserProfile?.full_name || otherUserName || 'User'}
        onRequestSubmit={handleRideRequestSubmit}
      />

      <TripRequestModal
        isOpen={showTripRequestModal}
        onClose={() => setShowTripRequestModal(false)}
        travelerId={otherUserId}
        travelerName={otherUserProfile?.full_name || otherUserName || 'User'}
        onRequestSubmit={handleTripRequestSubmit}
      />

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h3>
              <p className="text-gray-600 mb-6">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}