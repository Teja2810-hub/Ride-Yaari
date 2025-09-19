import React, { useState, useEffect } from 'react'
import { AlertTriangle, RotateCcw, Clock, X, CheckCircle } from 'lucide-react'
import { getReversalEligibility } from '../utils/confirmationHelpers'
import { RideConfirmation } from '../types'

interface AccidentalActionAlertProps {
  confirmation: RideConfirmation
  userId: string
  onReverse: (confirmationId: string, reason?: string) => void
  onDismiss: () => void
}

export default function AccidentalActionAlert({ 
  confirmation, 
  userId, 
  onReverse, 
  onDismiss 
}: AccidentalActionAlertProps) {
  const [eligibility, setEligibility] = useState<{
    canReverse: boolean
    timeRemaining?: number
    reversalType?: 'cancellation' | 'rejection'
  }>({ canReverse: false })
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkEligibility()
    
    // Check if user has already dismissed this alert
    const dismissedKey = `dismissed-reversal-${confirmation.id}`
    const wasDismissed = localStorage.getItem(dismissedKey)
    if (wasDismissed) {
      setDismissed(true)
    }
  }, [confirmation.id, userId])

  useEffect(() => {
    if (eligibility.timeRemaining && eligibility.timeRemaining > 0) {
      const interval = setInterval(() => {
        const hours = Math.floor(eligibility.timeRemaining!)
        const minutes = Math.floor((eligibility.timeRemaining! % 1) * 60)
        setTimeLeft(`${hours}h ${minutes}m`)
        
        // Auto-hide when time expires
        if (eligibility.timeRemaining! <= 0) {
          setDismissed(true)
        }
      }, 60000) // Update every minute

      // Initial calculation
      const hours = Math.floor(eligibility.timeRemaining)
      const minutes = Math.floor((eligibility.timeRemaining % 1) * 60)
      setTimeLeft(`${hours}h ${minutes}m`)

      return () => clearInterval(interval)
    }
  }, [eligibility.timeRemaining])

  const checkEligibility = async () => {
    try {
      const result = await getReversalEligibility(confirmation.id, userId)
      setEligibility(result)
    } catch (error) {
      console.error('Error checking reversal eligibility:', error)
    }
  }

  const handleDismiss = () => {
    const dismissedKey = `dismissed-reversal-${confirmation.id}`
    localStorage.setItem(dismissedKey, 'true')
    setDismissed(true)
    onDismiss()
  }

  const handleReverse = () => {
    onReverse(confirmation.id)
  }

  const getActionText = () => {
    switch (eligibility.reversalType) {
      case 'cancellation':
        return 'cancellation'
      case 'rejection':
        return 'rejection'
      default:
        return 'action'
    }
  }

  const getRideOrTripText = () => {
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    
    if (ride) {
      return `car ride from ${ride.from_location} to ${ride.to_location}`
    }
    if (trip) {
      return `airport trip from ${trip.leaving_airport} to ${trip.destination_airport}`
    }
    return 'ride'
  }

  // Don't show if not eligible, dismissed, or no time remaining
  if (!eligibility.canReverse || dismissed || !eligibility.timeRemaining || eligibility.timeRemaining <= 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4 mb-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle size={20} className="text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-2 flex items-center">
              <Clock size={16} className="mr-2" />
              Accidental {getActionText()}?
            </h3>
            
            <p className="text-sm text-orange-800 mb-3">
              You recently {eligibility.reversalType === 'rejection' ? 'rejected' : 'cancelled'} the {getRideOrTripText()}. 
              If this was accidental, you can reverse it within <strong>{timeLeft}</strong>.
            </p>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleReverse}
                className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors text-sm"
              >
                <RotateCcw size={14} />
                <span>Undo {getActionText()}</span>
              </button>
              
              <button
                onClick={handleDismiss}
                className="text-orange-700 hover:text-orange-800 font-medium text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>

            <p className="text-xs text-orange-600 mt-2">
              This will restore the confirmation and notify the other party.
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="text-orange-600 hover:text-orange-700 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}