import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, User, Plane, Car, Shield, Trash2, TriangleAlert as AlertTriangle, MessageCircle, X, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { ChatMessage, CarRide, Trip } from '../types'
import DisclaimerModal from './DisclaimerModal'
import ChatBlockingControls from './ChatBlockingControls'
import { popupManager } from '../utils/popupManager'
import { isUserBlocked, isChatDeleted } from '../utils/blockingHelpers'
import { formatDateTimeSafe } from '../utils/dateHelpers'

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

  useEffect(() => {
    if (user && otherUserId && otherUserId.trim()) {
      console.log('Chat: Starting to load chat data for users:', user.id, 'and', otherUserId)
      
      // Set a timeout to allow users to skip loading if it takes too long
      const timeout = setTimeout(() => {
        console.log('Chat: Loading timeout reached, showing skip option')
        setLoadingTimeout(timeout)
      }, 10000) // 10 seconds

      initializeChat()
      
      return () => {
        if (timeout) clearTimeout(timeout)
        if (loadingTimeout) clearTimeout(loadingTimeout)
      }
    } else {
      console.error('Chat: Missing required data:', { user: !!user, otherUserId })
      setError('Missing required user information')
      setLoading(false)
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

    try {
      console.log('Chat: Initializing chat between', user.id, 'and', otherUserId)
      
      // Check blocking status with timeout
      console.log('Chat: Checking if user is blocked...')
      const blockingPromise = isUserBlocked(user.id, otherUserId)
      const blockingTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Blocking check timeout')), 5000)
      )
      
      try {
        const blocked = await Promise.race([blockingPromise, blockingTimeout]) as boolean
        console.log('Chat: Blocking check result:', blocked)
        setIsBlocked(blocked)
      } catch (blockingError) {
        console.warn('Chat: Blocking check failed, continuing anyway:', blockingError)
        setIsBlocked(false)
      }

      // Check chat deletion status with timeout
      console.log('Chat: Checking if chat is deleted...')
      const deletionPromise = isChatDeleted(user.id, otherUserId)
      const deletionTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Deletion check timeout')), 5000)
      )
      
      try {
        const deleted = await Promise.race([deletionPromise, deletionTimeout]) as boolean
        console.log('Chat: Deletion check result:', deleted)
        setChatDeleted(deleted)
      } catch (deletionError) {
        console.warn('Chat: Deletion check failed, continuing anyway:', deletionError)
        setChatDeleted(false)
      }

      // Fetch other user profile with timeout
      console.log('Chat: Fetching other user profile...')
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', otherUserId)
        .single()
      
      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      )
      
      try {
        const { data: profile, error: profileError } = await Promise.race([
          profilePromise, 
          profileTimeout
        ]) as { data: any; error: any }
        
        if (profileError) {
          console.warn('Chat: Profile fetch error:', profileError)
          // Use fallback profile data
          setOtherUserProfile({
            id: otherUserId,
            full_name: otherUserName || 'User',
            profile_image_url: null
          })
        } else {
          console.log('Chat: Other user profile loaded:', profile?.full_name)
          setOtherUserProfile(profile)
        }
      } catch (profileError) {
        console.warn('Chat: Profile fetch timeout, using fallback:', profileError)
        setOtherUserProfile({
          id: otherUserId,
          full_name: otherUserName || 'User',
          profile_image_url: null
        })
      }

      // Fetch messages with timeout
      console.log('Chat: Fetching chat messages...')
      await fetchMessages()

      // Set up real-time subscription
      console.log('Chat: Setting up real-time subscription...')
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
      
      // Add timeout to message fetching
      const messagePromise = supabase
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

      const messageTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Message fetch timeout')), 8000)
      )

      const { data, error } = await Promise.race([
        messagePromise,
        messageTimeout
      ]) as { data: any; error: any }

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
      if (error.message?.includes('timeout')) {
        setError('Loading messages is taking longer than expected. Please try refreshing.')
      } else {
        setError('Failed to load messages. Please try again.')
      }
      // Set empty messages array to prevent infinite loading
      setMessages([])
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user || !otherUserId) return

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

    return () => {
      console.log('Chat: Cleaning up subscription')
      subscription.unsubscribe()
    }
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
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

      {/* Messages */}
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
      <div className="bg-white border-t border-gray-200 p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        
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
    </div>
  )
}