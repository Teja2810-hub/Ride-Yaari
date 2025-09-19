import React from 'react'
import { Clock, Check, X, AlertTriangle, Car, Plane, MessageCircle, Gift } from 'lucide-react'

interface EnhancedSystemMessageProps {
  message: string
  timestamp: string
  type?: 'request' | 'offer' | 'accept' | 'reject' | 'cancel' | 'system'
  rideType?: 'car' | 'airport'
}

export default function EnhancedSystemMessage({ 
  message, 
  timestamp, 
  type = 'system',
  rideType = 'car'
}: EnhancedSystemMessageProps) {
  const getMessageStyle = () => {
    switch (type) {
      case 'request':
        return {
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          icon: <MessageCircle size={14} className="text-blue-600" />,
          iconBg: 'bg-blue-100'
        }
      case 'offer':
        return {
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          textColor: 'text-purple-800',
          icon: <Gift size={14} className="text-purple-600" />,
          iconBg: 'bg-purple-100'
        }
      case 'accept':
        return {
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          icon: <Check size={14} className="text-green-600" />,
          iconBg: 'bg-green-100'
        }
      case 'reject':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          icon: <X size={14} className="text-red-600" />,
          iconBg: 'bg-red-100'
        }
      case 'cancel':
        return {
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
          icon: <AlertTriangle size={14} className="text-orange-600" />,
          iconBg: 'bg-orange-100'
        }
      default:
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          icon: <Clock size={14} className="text-yellow-600" />,
          iconBg: 'bg-yellow-100'
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

  return (
    <div className={`${style.bgColor} ${style.borderColor} border rounded-lg p-3 my-2`}>
      <div className="flex items-start space-x-3">
        <div className={`${style.iconBg} rounded-full p-2 flex items-center justify-center`}>
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <div className="flex items-center space-x-1">
              {rideIcon}
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {type === 'system' ? 'System Update' : `${type} ${rideType === 'car' ? 'Ride' : 'Trip'}`}
              </span>
            </div>
            <span className={`text-xs ${style.textColor} opacity-75`}>
              {formatTime(timestamp)}
            </span>
          </div>
          <p className={`text-sm ${style.textColor} leading-relaxed`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}