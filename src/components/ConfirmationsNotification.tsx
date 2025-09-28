import React, { useState, useEffect } from 'react'
import { Check, X, User, Car, Plane, Calendar, Clock, Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideConfirmation } from '../types'
import NotificationBadge from './NotificationBadge'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface ConfirmationsNotificationProps {
  onStartChat: (userId: string, userName: string) => void
  onViewConfirmations: () => void
}

export default function ConfirmationsNotification({ onStartChat, onViewConfirmations }: ConfirmationsNotificationProps) {
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchPendingConfirmations()
      
      // Subscribe to new confirmations
      const subscription = supabase
        .channel('confirmations_notification')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ride_confirmations',
            filter: `ride_owner_id=eq.${user.id}`,
          },
          () => {
            fetchPendingConfirmations()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ride_confirmations',
            filter: `ride_owner_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('ConfirmationsNotification: Confirmation update received:', payload)
            // Check if status was updated from pending or if any status change occurred
            if (payload.old.status !== payload.new.status) {
              fetchPendingConfirmations()
            }
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const fetchPendingConfirmations = async () => {
    if (!user) return

    console.log('ConfirmationsNotification: Fetching pending confirmations for user:', user.id)
    
    try {
      const { data, error } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          user_profiles!ride_confirmations_passenger_id_fkey (
            id,
            full_name,
            profile_image_url
          ),
          car_rides!ride_confirmations_ride_id_fkey (
            id,
            from_location,
            to_location,
            departure_date_time,
            price,
            currency
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date,
            price,
            currency
          )
        `)
        .eq('ride_owner_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (!error && data) {
        console.log('ConfirmationsNotification: Found pending confirmations:', data.length)
        setConfirmations(data)
        setPendingCount(data.length)
      } else if (error) {
        console.error('ConfirmationsNotification: Error fetching confirmations:', error)
      }
    } catch (error) {
      console.error('Error fetching pending confirmations:', error)
    }
  }

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown)
    if (!showDropdown) {
      fetchPendingConfirmations()
    }
  }


  return (
    <div className="relative">
      <button
        onClick={handleDropdownToggle}
        className="relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base group"
      >
        <div className="relative">
          <Check size={16} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
          {pendingCount > 0 && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <span className="hidden sm:inline">Ride Requests</span>
        <span className="sm:hidden">Requests</span>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center animate-bounce">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="fixed inset-x-2 top-16 sm:absolute sm:right-0 sm:top-full sm:inset-x-auto mt-2 w-auto sm:w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[80vh] sm:max-h-96">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Pending Ride Requests</h3>
            {pendingCount > 0 && (
              <div className="flex items-center space-x-2">
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {pendingCount} pending
                </span>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
            )}
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
                Loading requests...
              </div>
            ) : confirmations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No pending ride requests
              </div>
            ) : (
              <>
                {confirmations.map((confirmation) => {
                  const ride = confirmation.car_rides
                  const trip = confirmation.trips
                  const passenger = confirmation.user_profiles

                  return (
                    <div
                      key={confirmation.id}
                      className="p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-full overflow-hidden">
                          {passenger.profile_image_url ? (
                            <img
                              src={passenger.profile_image_url}
                              alt={passenger.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-semibold text-xs sm:text-sm">
                              {passenger.full_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                              {passenger.full_name}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full animate-pulse">
                                NEW
                              </span>
                              {ride ? (
                                <Car size={14} className="text-green-600" />
                              ) : (
                                <Plane size={14} className="text-blue-600" />
                              )}
                            </div>
                          </div>
                          
                          {ride && (
                            <div className="text-xs sm:text-sm text-gray-600 mb-2">
                              <div className="flex items-center space-x-1 mb-1">
                                <span className="font-medium">From:</span>
                                <span className="truncate">{ride.from_location}</span>
                              </div>
                              <div className="flex items-center space-x-1 mb-1">
                                <span className="font-medium">To:</span>
                                <span className="truncate">{ride.to_location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock size={12} />
                                <span>{formatDateTimeSafe(ride.departure_date_time)}</span>
                              </div>
                            </div>
                          )}

                          {trip && (
                            <div className="text-xs sm:text-sm text-gray-600 mb-2">
                              <div className="flex items-center space-x-1 mb-1">
                                <span className="font-medium">From:</span>
                                <span className="truncate">{trip.leaving_airport}</span>
                              </div>
                              <div className="flex items-center space-x-1 mb-1">
                                <span className="font-medium">To:</span>
                                <span className="truncate">{trip.destination_airport}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar size={12} />
                                <span>{formatDateSafe(trip.travel_date)}</span>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setShowDropdown(false)
                              onViewConfirmations()
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            Review Request
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                <div className="p-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      onViewConfirmations()
                    }}
                    className="w-full text-center text-blue-600 hover:text-blue-700 font-medium text-sm bg-blue-50 py-3 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    Manage All Requests ({pendingCount})
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}