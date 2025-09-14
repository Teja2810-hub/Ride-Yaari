import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, MessageCircle, Check, X, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { ChatMessage } from '../types'
import RideConfirmationModal from './RideConfirmationModal'

interface ChatProps {
  onBack: () => void
  otherUserId: string
  otherUserName: string
}

export default function Chat({ onBack, otherUserId, otherUserName }: ChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [userRides, setUserRides] = useState<any[]>([])
  const [userTrips, setUserTrips] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      fetchMessages()
      fetchUserRidesAndTrips()
      
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
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user, otherUserId])

  const fetchUserRidesAndTrips = async () => {
    if (!user) return

    try {
      // Fetch user's car rides
      const { data: rides } = await supabase
        .from('car_rides')
        .select('*')
        .eq('user_id', user.id)
        .gte('departure_date_time', new Date().toISOString())
        .order('departure_date_time')

      // Fetch user's trips
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .gte('travel_date', new Date().toISOString().split('T')[0])
        .order('travel_date')

      setUserRides(rides || [])
      setUserTrips(trips || [])
    } catch (error) {
      console.error('Error fetching user rides and trips:', error)
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

  const handleConfirmationSubmit = async (rideId: string | null, tripId: string | null) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('ride_confirmations')
        .insert({
          ride_id: rideId,
          trip_id: tripId,
          ride_owner_id: user.id,
          passenger_id: otherUserId,
          status: 'pending'
        })

      if (error) throw error

      // Send system message to notify about confirmation request
      const rideType = rideId ? 'car ride' : 'airport trip'
      const systemMessage = `🚗 Ride confirmation request sent for your ${rideType}. Please wait for a response.`
      
      await supabase
        .from('chat_messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          message_content: systemMessage,
          message_type: 'system',
          is_read: false
        })

      setShowConfirmationModal(false)
      fetchMessages()
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
          {(userRides.length > 0 || userTrips.length > 0) && (
            <div className="mb-3 flex justify-center">
              <button
                onClick={() => setShowConfirmationModal(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                <Check size={16} />
                <span>Send Ride Confirmation</span>
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
        rides={userRides}
        trips={userTrips}
        passengerName={otherUserName}
      />
    </div>
  )
}