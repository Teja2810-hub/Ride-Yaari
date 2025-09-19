import { supabase } from './supabase'
import { getSystemMessageTemplate } from './messageTemplates'
import { CarRide, Trip } from '../types'

export interface NotificationData {
  userId: string
  title: string
  message: string
  type: 'confirmation' | 'message' | 'system'
  priority: 'high' | 'medium' | 'low'
  actionData?: any
}

/**
 * Send enhanced system message with proper formatting and metadata
 */
export const sendEnhancedSystemMessage = async (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  senderId: string,
  receiverId: string,
  ride?: CarRide,
  trip?: Trip
): Promise<void> => {
  try {
    const template = getSystemMessageTemplate(action, userRole, ride, trip)
    
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message_content: template.message,
        message_type: 'system',
        is_read: false
      })
    
    if (error) {
      console.error('Error sending enhanced system message:', error)
      throw error
    }

    console.log(`Enhanced system message sent: ${template.title}`)
  } catch (error) {
    console.error('Failed to send enhanced system message:', error)
    throw error
  }
}

/**
 * Create browser notification (if permission granted)
 */
export const sendBrowserNotification = async (
  title: string,
  message: string,
  icon?: string
): Promise<void> => {
  if (!('Notification' in window)) {
    console.log('Browser notifications not supported')
    return
  }

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body: message,
        icon: icon || '/vite.svg',
        badge: '/vite.svg',
        tag: 'rideyaari-notification',
        requireInteraction: true,
        silent: false
      })

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (error) {
      console.error('Error showing browser notification:', error)
    }
  } else if (Notification.permission === 'default') {
    // Request permission
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      sendBrowserNotification(title, message, icon)
    }
  }
}

/**
 * Send comprehensive notification (system message + browser notification)
 */
export const sendComprehensiveNotification = async (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  senderId: string,
  receiverId: string,
  ride?: CarRide,
  trip?: Trip
): Promise<void> => {
  try {
    // Send enhanced system message
    await sendEnhancedSystemMessage(action, userRole, senderId, receiverId, ride, trip)
    
    // Send browser notification
    const template = getSystemMessageTemplate(action, userRole, ride, trip)
    await sendBrowserNotification(template.title, template.message, template.icon)
    
    console.log(`Comprehensive notification sent for ${action} by ${userRole}`)
  } catch (error) {
    console.error('Failed to send comprehensive notification:', error)
    // Don't throw - we don't want to break the main flow if notifications fail
  }
}

/**
 * Get notification statistics for a user
 */
export const getNotificationStats = async (userId: string) => {
  try {
    // Count pending confirmations where user is owner
    const { count: pendingConfirmations } = await supabase
      .from('ride_confirmations')
      .select('*', { count: 'exact', head: true })
      .eq('ride_owner_id', userId)
      .eq('status', 'pending')

    // Count unread messages
    const { count: unreadMessages } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false)

    // Count recent confirmation updates (last 24 hours)
    const { count: recentUpdates } = await supabase
      .from('ride_confirmations')
      .select('*', { count: 'exact', head: true })
      .eq('passenger_id', userId)
      .in('status', ['accepted', 'rejected'])
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    return {
      pendingConfirmations: pendingConfirmations || 0,
      unreadMessages: unreadMessages || 0,
      recentUpdates: recentUpdates || 0,
      total: (pendingConfirmations || 0) + (unreadMessages || 0) + (recentUpdates || 0)
    }
  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return {
      pendingConfirmations: 0,
      unreadMessages: 0,
      recentUpdates: 0,
      total: 0
    }
  }
}

/**
 * Request browser notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('Browser notifications not supported')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}