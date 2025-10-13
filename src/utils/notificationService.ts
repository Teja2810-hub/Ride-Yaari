import { supabase } from './supabase'
import { getSystemMessageTemplate } from './messageTemplates'
import { CarRide, Trip, UserProfile } from '../types'

// System user ID for automated messages (valid UUID format)
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

export interface NotificationPayload {
  userId: string
  title: string
  message: string
  type: 'confirmation_request' | 'confirmation_update' | 'message' | 'system'
  priority: 'high' | 'medium' | 'low'
  actionData?: any
  rideData?: CarRide
  tripData?: Trip
}

export interface NotificationStats {
  pendingConfirmations: number
  unreadMessages: number
  recentUpdates: number
  total: number
}

/**
 * Enhanced notification service for comprehensive user notifications
 */
export class NotificationService {
  private static instance: NotificationService
  private notificationQueue: NotificationPayload[] = []
  private isProcessing = false

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Send enhanced system message with proper formatting and metadata
   */
  async sendEnhancedSystemMessage(
    action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
    userRole: 'owner' | 'passenger',
    senderId: string,
    receiverId: string,
    ride?: CarRide,
    trip?: Trip,
    additionalContext?: string
  ): Promise<void> {
    try {
      console.log('NotificationService: sendEnhancedSystemMessage called', {
        action,
        userRole,
        senderId: senderId.slice(0, 8),
        receiverId: receiverId.slice(0, 8),
        additionalContext
      })

      const template = getSystemMessageTemplate(action, userRole, ride, trip)

      // Enhanced message with ride details and context
      let enhancedMessage = template.message
      if (additionalContext) {
        enhancedMessage += `\n\n📝 Additional Details: ${additionalContext}`
      }

      console.log('NotificationService: Inserting system message')
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          message_content: enhancedMessage,
          message_type: 'system',
          is_read: false
        })

      if (error) {
        console.error('Error sending enhanced system message:', error)
        throw error
      }

      console.log('NotificationService: System message sent successfully')

      // Add notification history entry for receiver
      try {
        const { data: senderProfile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', senderId)
          .single()

        await supabase.from('user_notifications').insert({
          user_id: receiverId,
          notification_type: 'system',
          title: template.title,
          message: template.message,
          priority: template.priority,
          is_read: false,
          related_user_id: senderId,
          related_user_name: senderProfile?.full_name || 'User',
          action_data: {
            action,
            userRole,
            rideId: ride?.id,
            tripId: trip?.id,
            additionalContext
          }
        })
      } catch (notifError) {
        console.warn('Failed to create notification history:', notifError)
      }

      console.log(`Enhanced system message sent: ${template.title}`)
    } catch (error) {
      console.error('Failed to send enhanced system message:', error)
      throw error
    }
  }

  /**
   * Queue browser notification for processing
   */
  private async queueBrowserNotification(payload: NotificationPayload): Promise<void> {
    this.notificationQueue.push(payload)
    
    if (!this.isProcessing) {
      this.processNotificationQueue()
    }
  }

  /**
   * Process queued browser notifications
   */
  private async processNotificationQueue(): Promise<void> {
    if (this.isProcessing || this.notificationQueue.length === 0) return

    this.isProcessing = true

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift()
      if (notification) {
        await this.sendBrowserNotification(
          notification.title,
          notification.message,
          this.getNotificationIcon(notification.type, notification.priority)
        )
        
        // Small delay between notifications to prevent spam
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    this.isProcessing = false
  }

  /**
   * Send browser notification with enhanced formatting
   */
  private async sendBrowserNotification(
    title: string,
    message: string,
    icon?: string
  ): Promise<void> {
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
          requireInteraction: false,
          silent: false,
          vibrate: [200, 100, 200], // Vibration pattern for mobile
          timestamp: Date.now()
        })

        // Auto-close after 8 seconds
        setTimeout(() => {
          notification.close()
        }, 8000)

        notification.onclick = () => {
          window.focus()
          notification.close()
        }

        console.log('Browser notification sent:', title)
      } catch (error) {
        console.error('Error showing browser notification:', error)
      }
    } else if (Notification.permission === 'default') {
      // Request permission
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        this.sendBrowserNotification(title, message, icon)
      }
    }
  }

  /**
   * Get appropriate icon for notification type
   */
  private getNotificationIcon(type: string, priority: string): string {
    const baseUrl = window.location.origin
    
    switch (type) {
      case 'confirmation_request':
        return `${baseUrl}/icons/request-${priority}.png`
      case 'confirmation_update':
        return priority === 'high' ? `${baseUrl}/icons/accepted.png` : `${baseUrl}/icons/rejected.png`
      case 'message':
        return `${baseUrl}/icons/message.png`
      default:
        return `${baseUrl}/vite.svg`
    }
  }

  /**
   * Send comprehensive notification (system message + browser notification + email)
   */
  async sendComprehensiveNotification(
    action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
    userRole: 'owner' | 'passenger',
    senderId: string,
    receiverId: string,
    ride?: CarRide,
    trip?: Trip,
    additionalContext?: string
  ): Promise<void> {
    try {
      const template = getSystemMessageTemplate(action, userRole, ride, trip, true)

      const { data: senderProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', senderId)
        .single()

      const { data: receiverProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', receiverId)
        .single()

      const senderName = senderProfile?.full_name || 'User'
      const receiverName = receiverProfile?.full_name || 'User'

      let notificationTitle = template.title
      let notificationMessage = template.message
      let notificationType = 'confirmation_request'

      if (action === 'request' && userRole === 'owner') {
        notificationTitle = `🚨 New ${ride ? 'car ride' : 'airport trip'} request`
        notificationMessage = `${senderName} wants to join your ${ride ? 'car ride' : 'airport trip'}. Tap to review and respond.`
        notificationType = ride ? 'ride_request_alert' : 'trip_request_alert'
      } else if (action === 'accept' && userRole === 'passenger') {
        notificationTitle = '🎉 Request Accepted!'
        notificationMessage = `Great news! Your request has been accepted. You can now coordinate details.`
        notificationType = 'confirmation_update'
      } else if (action === 'reject' && userRole === 'passenger') {
        notificationTitle = '😔 Request Declined'
        notificationMessage = `Your request was declined. You can try requesting again or find other options.`
        notificationType = 'confirmation_update'
      }

      const priority = action === 'request' ? 'high' : action === 'accept' ? 'high' : 'medium'

      await supabase.from('user_notifications').insert({
        user_id: receiverId,
        notification_type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        priority: priority,
        is_read: false,
        action_data: {
          action,
          userRole,
          senderId,
          rideId: ride?.id,
          tripId: trip?.id,
          additionalContext
        },
        related_user_id: senderId,
        related_user_name: senderName
      })

      await this.queueBrowserNotification({
        userId: receiverId,
        title: notificationTitle,
        message: notificationMessage,
        type: action === 'request' || action === 'offer' ? 'confirmation_request' : 'confirmation_update',
        priority: priority,
        rideData: ride,
        tripData: trip
      })

      console.log(`Comprehensive notification queued for ${action} by ${userRole}`)
    } catch (error) {
      console.error('Failed to send comprehensive notification:', error)
    }
  }

  /**
   * Send email notification via Supabase Edge Function
   */
  private async sendEmailNotification(
    action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
    userRole: 'owner' | 'passenger',
    receiverId: string,
    ride?: CarRide,
    trip?: Trip
  ): Promise<void> {
    try {
      // Get user email preferences
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('email_notifications, full_name')
        .eq('id', receiverId)
        .single()

      if (!userProfile?.email_notifications) {
        console.log('User has email notifications disabled')
        return
      }

      const template = getSystemMessageTemplate(action, userRole, ride, trip)
      
      // Call edge function for email notification
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          userId: receiverId,
          title: template.title,
          message: template.message,
          action: action,
          userRole: userRole,
          rideData: ride,
          tripData: trip
        }
      })

      if (error) {
        console.error('Error sending email notification:', error)
      } else {
        console.log('Email notification sent successfully')
      }
    } catch (error) {
      console.error('Failed to send email notification:', error)
    }
  }

  /**
   * Get comprehensive notification statistics for a user
   */
  async getNotificationStats(userId: string): Promise<NotificationStats> {
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

      // Count recent confirmation updates (last 48 hours)
      const { count: recentUpdates } = await supabase
        .from('ride_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('passenger_id', userId)
        .in('status', ['accepted', 'rejected'])
        .gte('updated_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())

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
   * Request browser notification permission with user-friendly prompt
   */
  async requestNotificationPermission(): Promise<boolean> {
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

  /**
   * Send test notification to verify setup
   */
  async sendTestNotification(): Promise<void> {
    const hasPermission = await this.requestNotificationPermission()
    
    if (hasPermission) {
      await this.sendBrowserNotification(
        'RideYaari Notifications Enabled! 🎉',
        'You\'ll now receive notifications for ride requests, messages, and updates.',
        '🔔'
      )
    }
  }

  /**
   * Batch send notifications for multiple users
   */
  async sendBatchNotifications(
    notifications: Array<{
      action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel'
      userRole: 'owner' | 'passenger'
      senderId: string
      receiverId: string
      ride?: CarRide
      trip?: Trip
      additionalContext?: string
    }>
  ): Promise<void> {
    const promises = notifications.map(notification =>
      this.sendComprehensiveNotification(
        notification.action,
        notification.userRole,
        notification.senderId,
        notification.receiverId,
        notification.ride,
        notification.trip,
        notification.additionalContext
      )
    )

    try {
      await Promise.allSettled(promises)
      console.log(`Batch notifications sent: ${notifications.length} notifications`)
    } catch (error) {
      console.error('Error sending batch notifications:', error)
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()

// Export utility functions for backward compatibility
export const sendEnhancedSystemMessage = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  senderId: string,
  receiverId: string,
  ride?: CarRide,
  trip?: Trip,
  additionalContext?: string
) => notificationService.sendEnhancedSystemMessage(action, userRole, senderId, receiverId, ride, trip, additionalContext)

export const sendComprehensiveNotification = (
  action: 'request' | 'offer' | 'accept' | 'reject' | 'cancel',
  userRole: 'owner' | 'passenger',
  senderId: string,
  receiverId: string,
  ride?: CarRide,
  trip?: Trip,
  additionalContext?: string
) => notificationService.sendComprehensiveNotification(action, userRole, senderId, receiverId, ride, trip, additionalContext)

export const getNotificationStats = (userId: string) => notificationService.getNotificationStats(userId)

export const requestNotificationPermission = () => notificationService.requestNotificationPermission()