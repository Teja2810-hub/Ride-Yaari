import React, { useState, useEffect } from 'react'
import { MessageCircle, X, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { ChatMessage } from '../types'

interface MessagesNotificationProps {
  onStartChat: (userId: string, userName: string) => void
}

interface Conversation {
  id: string
  other_user_id: string
  other_user_name: string
  other_user?: {
    id: string
    full_name: string
    profile_image_url?: string
  }
  last_message: string
  last_message_time: string
  unread_count: number
}

export default function MessagesNotification({ onStartChat }: MessagesNotificationProps) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchUnreadCount()
      
      // Subscribe to new messages
      const subscription = supabase
        .channel('messages_notification')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount()
            if (showDropdown) {
              fetchConversations()
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            // Check if is_read was updated to true
            if (payload.new.is_read === true && payload.old.is_read === false) {
              fetchUnreadCount()
              if (showDropdown) {
                fetchConversations()
              }
            }
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user, showDropdown])

  const fetchUnreadCount = async () => {
    if (!user) return

    try {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      if (!error) {
        setUnreadCount(count || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const fetchConversations = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:user_profiles!chat_messages_sender_id_fkey (
            id,
            full_name,
            profile_image_url
          ),
          receiver:user_profiles!chat_messages_receiver_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!error && data) {
        // Group messages by conversation
        const conversationMap = new Map()
        
        for (const message of data) {
          const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id
          const otherUser = message.sender_id === user.id ? message.receiver : message.sender
          
          if (!conversationMap.has(otherUserId)) {
            // Count unread messages for this conversation
            const unreadMessages = data.filter(m => 
              m.sender_id === otherUserId && 
              m.receiver_id === user.id && 
              !m.is_read
            ).length

            conversationMap.set(otherUserId, {
              id: message.id,
              other_user_id: otherUserId,
              other_user_name: otherUser?.full_name || 'Unknown',
              other_user: otherUser,
              last_message: message.message_content,
              last_message_time: message.created_at,
              unread_count: unreadMessages
            })
          }
        }
        
        setConversations(Array.from(conversationMap.values()))
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown)
    if (!showDropdown) {
      fetchConversations()
    }
  }

  const handleChatClick = async (userId: string, userName: string) => {
    // Mark messages as read
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('sender_id', userId)
      .eq('receiver_id', user?.id)

    if (!error) {
      // Re-fetch the actual unread count from database to ensure accuracy
      await fetchUnreadCount()
      // Re-fetch conversations to update the unread counts
      await fetchConversations()
    }

    setShowDropdown(false)
    onStartChat(userId, userName)
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
        day: 'numeric'
      })
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleDropdownToggle}
        className="relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
      >
        <MessageCircle size={16} className="sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">Messages</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="fixed inset-x-2 top-16 sm:absolute sm:right-0 sm:top-full sm:inset-x-auto mt-2 w-auto sm:w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[80vh] sm:max-h-96">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Messages</h3>
            <button
              onClick={() => setShowDropdown(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.other_user_id}
                  onClick={() => handleChatClick(conversation.other_user_id, conversation.other_user_name)}
                  className="p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-full overflow-hidden">
                      {conversation.other_user?.profile_image_url ? (
                        <img
                          src={conversation.other_user.profile_image_url}
                          alt={conversation.other_user_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-semibold text-xs sm:text-sm">
                          {conversation.other_user_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                          {conversation.other_user_name}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatTime(conversation.last_message_time)}
                          </span>
                          {conversation.unread_count > 0 && (
                            <span className="bg-blue-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                              {conversation.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 truncate mt-1">
                        {conversation.last_message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}