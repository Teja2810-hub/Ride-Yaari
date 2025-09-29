import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, User, MessageCircle, Trash2, Shield, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { ChatMessage, CarRide, Trip } from '../types'
import RideConfirmationModal from './RideConfirmationModal'
import DisclaimerModal from './DisclaimerModal'
import ChatBlockingControls from './ChatBlockingControls'
import { useConfirmationFlow } from '../hooks/useConfirmationFlow'
import { popupManager } from '../utils/popupManager'
import { clearChatDeletion } from '../utils/blockingHelpers'
import EnhancedSystemMessage from './EnhancedSystemMessage'

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
  const [error, setError] = useState('')
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerType, setDisclaimerType] = useState<'ride-confirmation' | 'chat-trip' | 'chat-ride'>('ride-confirmation')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [hasBlockedOther, setHasBlockedOther] = useState(false)
  const [chatDeleted, setChatDeleted] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)

  const { createConfirmation } = useConfirmationFlow({
    onUpdate: () => {
      console.log('Confirmation flow completed')
    },
    onSuccess: (message) => {
      console.log('Confirmation success:', message)
      setShowConfirmationModal(false)
      setShowDisclaimer(false)
    }
  })

  useEffect(() => {
    if (user && otherUserId) {
      initializeChat()
    }
    
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [user, otherUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeChat = async () => {
    try {
      setLoading(true)
      setError('')
      
      await Promise.all([
        fetchOtherUserProfile(),
        fetchMessages(),
        checkBlockingStatus(),
        clearChatDeletionIfNeeded()
      ])
      
      setupRealtimeSubscription()
    } catch (error: any) {
      console.error('Error initializing chat:', error)
      setError('Failed to load chat. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchOtherUserProfile = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', otherUserId)
      .single()

    if (!error && data) {
      setOtherUserProfile(data)
    }
  }

  const fetchMessages = async () => {
    if (!user) return

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

    if (error) {
      console.error('Error fetching messages:', error)
      setError('Failed to load messages')
      return
    }

    setMessages(data || [])
    markMessagesAsRead()
  }

  const setupRealtimeSubscription = () => {
    if (!user) return

    const newSubscription = supabase
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
          const newMessage = payload.new as ChatMessage
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id)
            if (exists) return prev
            return [...prev, newMessage]
          })
          
          if (newMessage.sender_id === otherUserId) {
            markMessagesAsRead()
          }
        }
      )
      .subscribe()

    setSubscription(newSubscription)
  }

  const checkBlockingStatus = async () => {
    if (!user) return

    try {
      const { isUserBlocked } = await import('../utils/blockingHelpers')
      const [blocked, hasBlocked] = await Promise.all([
        isUserBlocked(otherUserId, user.id),
        isUserBlocked(user.id, otherUserId)
      ])
      
      setIsBlocked(blocked)
      setHasBlockedOther(hasBlocked)
    } catch (error) {
      console.error('Error checking blocking status:', error)
    }
  }

  const clearChatDeletionIfNeeded = async () => {
    if (!user) return

    try {
      await clearChatDeletion(user.id, otherUserId)
    } catch (error) {
      console.error('Error clearing chat deletion:', error)
    }
  }

  const markMessagesAsRead = async () => {
    if (!user) return

    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('is_read', false)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setSending(true)

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          message_content: messageContent,
          message_type: 'user',
          is_read: false
        })
        .select(`
          *,
          sender:user_profiles!chat_messages_sender_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .single()

      if (error) throw error

      // Don't add to messages here - let the realtime subscription handle it
    } catch (error: any) {
      console.error('Error sending message:', error)
      setError('Failed to send message. Please try again.')
      setNewMessage(messageContent)
    } finally {
      setSending(false)
    }
  }

  const handleSendConfirmation = async () => {
    if (!user) return

    try {
      const rideId = preSelectedRide?.id || null
      const tripId = preSelectedTrip?.id || null
      const rideOwnerId = preSelectedRide?.user_id || preSelectedTrip?.user_id || otherUserId

      await createConfirmation(rideId, tripId, rideOwnerId, user.id)
    } catch (error: any) {
      console.error('Error sending confirmation:', error)
      setError('Failed to send confirmation. Please try again.')
    }
  }

  const handleConfirmationClick = () => {
    if (popupManager.shouldShowDisclaimer('ride-confirmation', user?.id)) {
      setDisclaimerType('ride-confirmation')
      setShowDisclaimer(true)
    } else {
      setShowConfirmationModal(true)
    }
  }

  const handleDisclaimerConfirm = () => {
    setShowDisclaimer(false)
    popupManager.markDisclaimerShown('ride-confirmation', user?.id)
    setShowConfirmationModal(true)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (chatDeleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Chat Deleted</h2>
          <p className="text-gray-600 mb-6">This chat has been deleted and is no longer available.</p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 to-indigo-100/90 travel-bg flex flex-col">
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
                    alt={otherUserName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold">
                    {otherUserName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{otherUserName}</h1>
                <p className="text-sm text-gray-600">
                  {preSelectedRide ? 'Car Ride Chat' : preSelectedTrip ? 'Airport Trip Chat' : 'Chat'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {(preSelectedRide || preSelectedTrip) && !isBlocked && !hasBlockedOther && (
              <button
                onClick={handleConfirmationClick}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <MessageCircle size={16} />
                <span>Send Confirmation</span>
              </button>
            )}
            
            <ChatBlockingControls
              otherUserId={otherUserId}
              otherUserName={otherUserName}
              onBlock={() => {
                setHasBlockedOther(true)
                onBack()
              }}
              onUnblock={() => {
                setHasBlockedOther(false)
              }}
              onDeleteChat={() => {
                setChatDeleted(true)
                setTimeout(() => onBack(), 1000)
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {(isBlocked || hasBlockedOther) && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="flex items-center space-x-3">
            <Shield size={20} className="text-yellow-600" />
            <p className="text-yellow-800">
              {isBlocked 
                ? 'This user has blocked you. You cannot send messages.'
                : 'You have blocked this user. Unblock to send messages.'
              }
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Start the conversation</h3>
            <p className="text-gray-600">
              Send a message to {otherUserName} to begin your chat
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              {message.message_type === 'system' ? (
                <EnhancedSystemMessage
                  message={message.message_content}
                  timestamp={message.created_at}
                  type="system"
                  rideType={preSelectedRide ? 'car' : 'airport'}
                  priority="medium"
                />
              ) : (
                <div
                  className={`flex ${
                    message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm">{message.message_content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender_id === user?.id
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isBlocked && !hasBlockedOther && (
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${otherUserName}...`}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      )}

      <RideConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleSendConfirmation}
        passengerName={user?.email || 'You'}
        preSelectedRide={preSelectedRide}
        preSelectedTrip={preSelectedTrip}
      />

      <DisclaimerModal
        isOpen={showDisclaimer}
        onClose={() => setShowDisclaimer(false)}
        onConfirm={handleDisclaimerConfirm}
        loading={false}
        type={disclaimerType}
      />
    </div>
  )
}