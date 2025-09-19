import React, { useState, useEffect } from 'react'
import { CheckCircle, Clock, RotateCcw, X, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { getReversalEligibility } from '../utils/confirmationHelpers'
import { RideConfirmation } from '../types'

interface ReversalConfirmationBannerProps {
  onReverse?: (confirmationId: string) => void
}

export default function ReversalConfirmationBanner({ onReverse }: ReversalConfirmationBannerProps) {
  const { user } = useAuth()
  const [reversibleConfirmations, setReversibleConfirmations] = useState<RideConfirmation[]>([])
  const [loading, setLoading] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (user) {
      checkReversibleConfirmations()
      
      // Check every minute for time updates
      const interval = setInterval(checkReversibleConfirmations, 60000)
      return () => clearInterval(interval)
    }
  }, [user])

  const checkReversibleConfirmations = async () => {
    if (!user) return

    try {
      // Get recent rejected confirmations
      const { data: rejectedConfirmations, error } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          car_rides!ride_confirmations_ride_id_fkey (
            id,
            from_location,
            to_location,
            departure_date_time
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date
          ),
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name
          )
        `)
        .or(`ride_owner_id.eq.${user.id},passenger_id.eq.${user.id}`)
        .eq('status', 'rejected')
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('updated_at', { ascending: false })

      if (error) throw error

      const reversible: RideConfirmation[] = []

      for (const confirmation of rejectedConfirmations || []) {
        const eligibility = await getReversalEligibility(confirmation.id, user.id)
        if (eligibility.canReverse && eligibility.timeRemaining && eligibility.timeRemaining > 0) {
          reversible.push(confirmation)
        }
      }

      setReversibleConfirmations(reversible)
      setShowBanner(reversible.length > 0)
    } catch (error) {
      console.error('Error checking reversible confirmations:', error)
    }
  }

  const formatTimeRemaining = (confirmation: RideConfirmation) => {
    const updatedAt = new Date(confirmation.updated_at)
    const now = new Date()
    const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
    const timeRemaining = 24 - hoursSinceUpdate
    
    const hours = Math.floor(timeRemaining)
    const minutes = Math.floor((timeRemaining % 1) * 60)
    
    return `${hours}h ${minutes}m`
  }

  const getRideOrTripText = (confirmation: RideConfirmation) => {
    const ride = confirmation.car_rides
    const trip = confirmation.trips
    
    if (ride) {
      return `car ride to ${ride.to_location}`
    }
    if (trip) {
      return `airport trip to ${trip.destination_airport}`
    }
    return 'ride'
  }

  const handleReverse = (confirmationId: string) => {
    if (onReverse) {
      onReverse(confirmationId)
    }
    // Remove from local state
    setReversibleConfirmations(prev => prev.filter(c => c.id !== confirmationId))
  }

  const handleDismissAll = () => {
    // Store dismissal in localStorage
    reversibleConfirmations.forEach(confirmation => {
      const dismissedKey = `dismissed-reversal-${confirmation.id}`
      localStorage.setItem(dismissedKey, 'true')
    })
    setShowBanner(false)
  }

  if (!showBanner || reversibleConfirmations.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <RotateCcw size={20} className="text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-orange-900 mb-2">
              Accidental Actions Available for Reversal
            </h3>
            
            <p className="text-sm text-orange-800 mb-4">
              You have {reversibleConfirmations.length} recent {reversibleConfirmations.length === 1 ? 'action' : 'actions'} 
              that can be reversed within the next 24 hours.
            </p>

            <div className="space-y-3">
              {reversibleConfirmations.slice(0, 3).map((confirmation) => (
                <div key={confirmation.id} className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {getRideOrTripText(confirmation)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {confirmation.ride_owner_id === user?.id ? 'You rejected' : 'You cancelled'} • 
                        {formatTimeRemaining(confirmation)} left to reverse
                      </p>
                    </div>
                    <button
                      onClick={() => handleReverse(confirmation.id)}
                      className="flex items-center space-x-1 bg-orange-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-orange-700 transition-colors text-xs"
                    >
                      <RotateCcw size={12} />
                      <span>Undo</span>
                    </button>
                  </div>
                </div>
              ))}
              
              {reversibleConfirmations.length > 3 && (
                <p className="text-xs text-orange-700">
                  And {reversibleConfirmations.length - 3} more actions available for reversal...
                </p>
              )}
            </div>

            <div className="flex items-center space-x-4 mt-4">
              <button
                onClick={checkReversibleConfirmations}
                disabled={loading}
                className="text-orange-700 hover:text-orange-800 font-medium text-sm transition-colors"
              >
                Refresh
              </button>
              
              <button
                onClick={handleDismissAll}
                className="text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors"
              >
                Dismiss All
              </button>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleDismissAll}
          className="text-orange-600 hover:text-orange-700 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}