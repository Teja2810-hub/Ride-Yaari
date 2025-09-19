import React from 'react'
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { RideConfirmation } from '../types'
import { getConfirmationExpiryInfo } from '../utils/confirmationHelpers'

interface ConfirmationExpiryBadgeProps {
  confirmation: RideConfirmation
  showDetails?: boolean
}

export default function ConfirmationExpiryBadge({ 
  confirmation, 
  showDetails = false 
}: ConfirmationExpiryBadgeProps) {
  const expiryInfo = getConfirmationExpiryInfo(confirmation)

  if (!expiryInfo.willExpire) {
    return null
  }

  const getExpiryStatus = () => {
    if (expiryInfo.isExpired) {
      return {
        icon: <XCircle size={14} className="text-red-600" />,
        text: 'Expired',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200'
      }
    }

    if (!expiryInfo.timeUntilExpiry) {
      return {
        icon: <AlertTriangle size={14} className="text-orange-600" />,
        text: 'Expiring Soon',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-200'
      }
    }

    // Parse time until expiry to determine urgency
    const timeStr = expiryInfo.timeUntilExpiry
    const isUrgent = timeStr.includes('hour') || timeStr.includes('minute')

    if (isUrgent) {
      return {
        icon: <AlertTriangle size={14} className="text-orange-600" />,
        text: `${timeStr} left`,
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
        borderColor: 'border-orange-200'
      }
    }

    return {
      icon: <Clock size={14} className="text-yellow-600" />,
      text: `${timeStr} left`,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200'
    }
  }

  const status = getExpiryStatus()

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-medium ${status.bgColor} ${status.textColor} ${status.borderColor} ${
      !expiryInfo.isExpired && expiryInfo.timeUntilExpiry?.includes('hour') ? 'animate-pulse' : ''
    }`}>
      {status.icon}
      <span>{status.text}</span>
      
      {showDetails && expiryInfo.expiryDate && (
        <span className="text-xs opacity-75">
          ({expiryInfo.expiryDate.toLocaleDateString()})
        </span>
      )}
    </div>
  )
}