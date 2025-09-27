import React from 'react'
import { Clock, Check, X, TriangleAlert as AlertTriangle, Car, Plane, MessageCircle, Gift } from 'lucide-react'

interface EnhancedSystemMessageProps {
  message: string
  timestamp: string
  type?: 'request' | 'offer' | 'accept' | 'reject' | 'cancel' | 'system'
  rideType?: 'car' | 'airport'
  priority?: 'high' | 'medium' | 'low'
  actionRequired?: boolean
  onExpire?: () => void
}

export default function EnhancedSystemMessage({ 
  message, 
  timestamp, 
  type = 'system',
  rideType = 'car',
  priority = 'medium',
  actionRequired = false,
  onExpire
}: EnhancedSystemMessageProps) {
  const [isExpired, setIsExpired] = React.useState(false)

  React.useEffect(() => {
    // Auto-expire accept/reject messages immediately when component mounts or when chat is reopened
    const messageContent = message.toLowerCase()
    if (messageContent.includes('accepted') || messageContent.includes('approved') || 
        messageContent.includes('declined') || messageContent.includes('rejected')) {
      // These messages should disappear immediately when chat is reopened
      const timer = setTimeout(() => {
        setIsExpired(true)
        if (onExpire) {
          onExpire()
        }
      }, 100) // Very short delay to ensure message is seen briefly
      
      return () => clearTimeout(timer)
    }
    
    // Auto-expire request messages after 30 seconds to reduce chat clutter
    if (messageContent.includes('requested to join') || messageContent.includes('new request')) {
      const timer = setTimeout(() => {
        setIsExpired(true)
        if (onExpire) {
          onExpire()
        }
      }, 30000) // 30 seconds
      
      return
    }
    
    // Auto-expire cancel messages after 10 minutes
    if (type === 'cancel' || messageContent.includes('cancelled')) {
      const messageTime = new Date(timestamp)
      const now = new Date()
      const minutesSinceMessage = (now.getTime() - messageTime.getTime()) / (1000 * 60)
      
      if (minutesSinceMessage >= 10) {
        setIsExpired(true)
        if (onExpire) {
          onExpire()
        }
        return
      }
      
      // Set timer for remaining time
      const remainingMs = (10 * 60 * 1000) - (minutesSinceMessage * 60 * 1000)
      if (remainingMs > 0) {
        const timer = setTimeout(() => {
          setIsExpired(true)
          if (onExpire) {
            onExpire()
          }
        }, remainingMs)
        
        return () => clearTimeout(timer)
      }
    }
  }, [timestamp, type, onExpire])

  // Don't render expired messages
  if (isExpired) {
    return null
  }

  const getMessageStyle = () => {
    switch (type) {
      case 'request':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          icon: <MessageCircle size={14} className="text-blue-600" />,
          iconBg: 'bg-blue-100',
          glowClass: priority === 'high' ? 'animate-notification-glow' : ''
        }
      case 'offer':
        return {
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-800',
          icon: <Gift size={14} className="text-purple-600" />,
          iconBg: 'bg-purple-100',
          glowClass: priority === 'high' ? 'animate-notification-glow' : ''
        }
      case 'accept':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          icon: <Check size={14} className="text-green-600" />,
          iconBg: 'bg-green-100',
          glowClass: 'animate-notification-bounce'
        }
      case 'reject':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          icon: <X size={14} className="text-red-600" />,
          iconBg: 'bg-red-100',
          glowClass: ''
        }
      case 'cancel':
        return {
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
          icon: <AlertTriangle size={14} className="text-orange-600" />,
          iconBg: 'bg-orange-100',
          glowClass: priority === 'high' ? 'animate-notification-pulse' : ''
        }
      default:
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          icon: <Clock size={14} className="text-yellow-600" />,
          iconBg: 'bg-yellow-100',
          glowClass: ''
        }
    }
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

  const style = getMessageStyle()
  const rideIcon = rideType === 'car' ? <Car size={12} /> : <Plane size={12} />

  const getPriorityIndicator = () => {
    if (priority === 'high') {
      return <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full animate-pulse">HIGH</span>
    }
    if (actionRequired) {
      return <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">ACTION REQUIRED</span>
    }
    return null
  }
  return (
    <div className={`${style.bgColor} ${style.borderColor} border rounded-lg p-3 my-2 max-w-md ${style.glowClass} ${
      priority === 'high' ? 'border-l-4 border-l-red-500' : 
      actionRequired ? 'border-l-4 border-l-yellow-500' : ''
    }`}>
      <div className="flex items-start space-x-3">
        <div className={`${style.iconBg} rounded-full p-2 flex items-center justify-center ${
          priority === 'high' ? 'animate-notification-pulse' : ''
        }`}>
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1">
              {rideIcon}
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {type === 'system' ? 'System Update' : `${type} ${rideType === 'car' ? 'Ride' : 'Trip'}`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {getPriorityIndicator()}
              <span className={`text-xs ${style.textColor} opacity-75`}>
                {formatTime(timestamp)}
              </span>
            </div>
          </div>
          <div className={`text-sm ${style.textColor} leading-relaxed`}>
            {/* Format enhanced messages with proper line breaks and styling */}
            {message.split('\n').map((line, index) => {
              if (line.includes('**') && line.includes('**')) {
                // Handle bold text
                const parts = line.split('**')
                return (
                  <p key={index} className={index === 0 ? 'font-semibold' : ''}>
                    {parts.map((part, partIndex) => 
                      partIndex % 2 === 1 ? <strong key={partIndex}>{part}</strong> : part
                    )}
                  </p>
                )
              } else if (line.startsWith('•') || line.startsWith('✅') || line.startsWith('📱')) {
                // Handle bullet points and action items
                return <p key={index} className="ml-2 text-xs opacity-90">{line}</p>
              } else if (line.trim() === '') {
                // Handle empty lines
                return <br key={index} />
              } else {
                // Regular text
                return <p key={index}>{line}</p>
              }
            })}
          </div>
        </div>
      </div>
    </div>
  )
}