import React, { useState, useEffect } from 'react'
import { Check, Clock, X, TriangleAlert as AlertTriangle, Car, Plane, ListFilter as Filter, Search, Calendar, Import as SortAsc, Dessert as SortDesc, ChevronDown, ChevronUp, RefreshCw, CircleCheck as CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../utils/supabase'
import { RideConfirmation } from '../types'
import ConfirmationItem from './ConfirmationItem'
import AccidentalActionAlert from './AccidentalActionAlert'
import ConfirmationExpiryBanner from './ConfirmationExpiryBanner'
import { reverseAction } from '../utils/confirmationHelpers'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

interface UserConfirmationsContentProps {
  onStartChat: (userId: string, userName: string, ride?: any, trip?: any) => void
}

export default function UserConfirmationsContent({ onStartChat }: UserConfirmationsContentProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [confirmations, setConfirmations] = useState<RideConfirmation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'car' | 'airport'>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'status'>('date-desc')
  const [showFilters, setShowFilters] = useState(false)
  const [recentActions, setRecentActions] = useState<RideConfirmation[]>([])
  const [expandedSections, setExpandedSections] = useState<{
    pending: boolean
    accepted: boolean
    rejected: boolean
  }>({
    pending: true, // Start with pending expanded since it's most important
    accepted: false,
    rejected: false
  })
  const [cancellingConfirmationId, setCancellingConfirmationId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')


  // Derived state calculations - must be done after all hooks but before any returns
  const categorized = React.useMemo(() => {
    const filtered = filteredAndSortedConfirmations()
    
    console.log('UserConfirmationsContent: Categorizing confirmations', {
      total: filtered.length,
      statuses: filtered.map(c => ({ id: c.id.slice(0, 8), status: c.status }))
    })
    
    const pending = filtered.filter(c => c.status === 'pending')
    const accepted = filtered.filter(c => c.status === 'accepted')
    const rejected = filtered.filter(c => c.status === 'rejected')

    console.log('UserConfirmationsContent: Categorization result', {
      pending: pending.length,
      accepted: accepted.length,
      rejected: rejected.length
    })

    return {
      pending: {
        carRides: pending.filter(c => c.ride_id),
        airportTrips: pending.filter(c => c.trip_id)
      },
      accepted: {
        carRides: accepted.filter(c => c.ride_id),
        airportTrips: accepted.filter(c => c.trip_id)
      },
      rejected: {
        carRides: rejected.filter(c => c.ride_id),
        airportTrips: rejected.filter(c => c.trip_id)
      }
    }
  }, [confirmations, searchTerm, statusFilter, typeFilter, sortBy])

  const stats = React.useMemo(() => {
    const filtered = filteredAndSortedConfirmations()
    const total = filtered.length
    const pending = filtered.filter(c => c.status === 'pending').length
    const accepted = filtered.filter(c => c.status === 'accepted').length
    const rejected = filtered.filter(c => c.status === 'rejected').length
    const carRides = filtered.filter(c => c.ride_id).length
    const airportTrips = filtered.filter(c => c.trip_id).length

    return { total, pending, accepted, rejected, carRides, airportTrips }
  }, [confirmations, searchTerm, statusFilter, typeFilter, sortBy])

  const hasAnyConfirmations = confirmations.length > 0

  // Auto-expand pending section when there are new pending confirmations
  React.useEffect(() => {
    const pendingCount = categorized.pending.carRides.length + categorized.pending.airportTrips.length
    if (pendingCount > 0 && !expandedSections.pending) {
      console.log('UserConfirmationsContent: Auto-expanding pending section due to new confirmations')
      setExpandedSections(prev => ({ ...prev, pending: true }))
    }
  }, [categorized.pending.carRides.length, categorized.pending.airportTrips.length, expandedSections.pending])

  useEffect(() => {
    if (user) {
      fetchConfirmations()
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    
    // Subscribe to confirmation changes
    const subscription = supabase
      .channel('user_confirmations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_confirmations',
          filter: `or(ride_owner_id.eq.${user.id},passenger_id.eq.${user.id})`,
        },
        () => {
          console.log('UserConfirmationsContent: Confirmation change detected, refreshing...')
          fetchConfirmations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_confirmations',
          filter: `or(ride_owner_id.eq.${user.id},passenger_id.eq.${user.id})`,
        },
        (payload) => {
          console.log('UserConfirmationsContent: Confirmation UPDATE detected:', payload)
          
          // Handle different status change scenarios
          const oldStatus = payload.old.status
          const newStatus = payload.new.status
          
          // Check if status changed from rejected to pending (re-request)
          if (oldStatus === 'rejected' && newStatus === 'pending') {
            console.log('UserConfirmationsContent: Re-request detected, refreshing immediately')
            setSuccessMessage('Request sent again successfully! It will appear in the pending section.')
            setTimeout(() => setSuccessMessage(''), 5000)
            // Add small delay to ensure database consistency
            setTimeout(() => {
              fetchConfirmations()
              checkForRecentActions()
            }, 500)
          }
          // Check if status changed from accepted to rejected (cancellation)
          else if (oldStatus === 'accepted' && newStatus === 'rejected') {
            console.log('UserConfirmationsContent: Cancellation detected, refreshing and checking for reversal alerts')
            setSuccessMessage('Ride cancelled successfully. You can reverse this action within 24 hours if it was accidental.')
            setTimeout(() => setSuccessMessage(''), 8000)
            // Add delay to ensure database consistency
            setTimeout(() => {
              fetchConfirmations()
              checkForRecentActions()
            }, 500)
          }
          // Check if status changed from rejected to accepted (reversal)
          else if (oldStatus === 'rejected' && newStatus === 'accepted') {
            console.log('UserConfirmationsContent: Reversal detected, refreshing immediately')
            setSuccessMessage('Action reversed successfully! The confirmation has been restored.')
            setTimeout(() => setSuccessMessage(''), 5000)
            // Add delay to ensure database consistency
            setTimeout(() => {
              fetchConfirmations()
              checkForRecentActions()
            }, 500)
          } else {
            // Handle other status changes
            fetchConfirmations()
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const checkForRecentActions = () => {
    console.log('UserConfirmationsContent: Checking for recent actions')
    const now = new Date()
    const recentlyRejected = confirmations.filter(confirmation => {
      if (confirmation.status !== 'rejected') return false
      
      const updatedAt = new Date(confirmation.updated_at)
      const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
      
      // Show alert for actions within the last 24 hours
      const isRecent = hoursSinceUpdate <= 24
      
      if (isRecent) {
        console.log('UserConfirmationsContent: Found recent rejection:', {
          id: confirmation.id.slice(0, 8),
          hoursSinceUpdate,
          updatedAt: updatedAt.toISOString()
        })
      }
      
      return isRecent
    })
    
    console.log('UserConfirmationsContent: Recent actions found:', recentlyRejected.length)
    setRecentActions(recentlyRejected)
  }

  const fetchConfirmations = async () => {
    if (!user) return

    console.log('UserConfirmationsContent: Fetching confirmations for user:', user.id)
    
    await handleAsync(async () => {
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
            currency,
            user_id,
            negotiable
          ),
          trips!ride_confirmations_trip_id_fkey (
            id,
            leaving_airport,
            destination_airport,
            travel_date,
            departure_time,
            departure_timezone,
            landing_date,
            landing_time,
            landing_timezone,
            price,
            currency,
            user_id,
            negotiable
          )
        `)
        .or(`ride_owner_id.eq.${user.id},passenger_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('UserConfirmationsContent: Fetched confirmations:', data?.length || 0)
      
      // Log status distribution for debugging
      if (data) {
        const statusCounts = data.reduce((acc, conf) => {
          acc[conf.status] = (acc[conf.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        console.log('UserConfirmationsContent: Status distribution:', statusCounts)
      }
      
      setConfirmations(data || [])
      checkForRecentActions()
    })
  }

  const handleReverseAction = async (confirmationId: string, reason?: string) => {
    if (!user) return

    try {
      const result = await reverseAction(confirmationId, user.id, reason)
      
      if (result.success) {
        // Remove from recent actions and refresh confirmations
        setRecentActions(prev => prev.filter(c => c.id !== confirmationId))
        fetchConfirmations()
      } else {
        alert(result.error || 'Failed to reverse action')
      }
    } catch (error: any) {
      console.error('Error reversing action:', error)
      alert('Failed to reverse action. Please try again.')
    }
  }

  const handleDismissAlert = (confirmationId: string) => {
    setRecentActions(prev => prev.filter(c => c.id !== confirmationId))
  }

  const handleCancelRequest = async (confirmationId: string) => {
    if (!user) return

    setCancellingConfirmationId(confirmationId)
    
    // Immediately update the local state to reflect the cancellation
    setConfirmations(prev => 
      prev.map(conf => 
        conf.id === confirmationId 
          ? { ...conf, status: 'rejected' as const, updated_at: new Date().toISOString() }
          : conf
      )
    )

    await handleAsync(async () => {
      const { error } = await supabase
        .from('ride_confirmations')
        .update({
          status: 'rejected',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', confirmationId)
        .eq('passenger_id', user.id) // Ensure only passenger can cancel their own request
        .eq('status', 'pending') // Only allow cancelling pending requests

      if (error) throw error

      // Get confirmation details for system message
      const { data: confirmation } = await supabase
        .from('ride_confirmations')
        .select(`
          *,
          car_rides!ride_confirmations_ride_id_fkey (
            from_location,
            to_location,
            departure_date_time
          ),
          trips!ride_confirmations_trip_id_fkey (
            leaving_airport,
            destination_airport,
            travel_date
          ),
          user_profiles!ride_confirmations_passenger_id_fkey (
            full_name
          )
        `)
        .eq('id', confirmationId)
        .single()

      if (confirmation) {
        const ride = confirmation.car_rides
        const trip = confirmation.trips
        const passengerName = confirmation.user_profiles?.full_name || 'Passenger'
        
        const rideDetails = ride 
          ? `car ride from ${ride.from_location} to ${ride.to_location}`
          : trip 
            ? `airport trip from ${trip.leaving_airport} to ${trip.destination_airport}`
            : 'ride'

        // Send system message to ride owner
        await supabase
          .from('chat_messages')
          .insert({
            sender_id: user.id,
            receiver_id: confirmation.ride_owner_id,
            message_content: `🚫 ${passengerName} has cancelled their request for the ${rideDetails}. Your ${ride ? 'ride' : 'trip'} is now available for new requests.`,
            message_type: 'system',
            is_read: false
          })
      }

      // Refresh confirmations to get the latest data from server
      fetchConfirmations()
    }).finally(() => {
      setCancellingConfirmationId(null)
    })
  }

  const toggleSection = (section: 'pending' | 'accepted' | 'rejected') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const filteredAndSortedConfirmations = () => {
    let filtered = confirmations.filter(confirmation => {
      // Search filter
      const searchMatch = confirmation.user_profiles.full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      
      // Status filter
      const statusMatch = statusFilter === 'all' || confirmation.status === statusFilter
      
      // Type filter
      let typeMatch = true
      if (typeFilter === 'car') {
        typeMatch = !!confirmation.ride_id
      } else if (typeFilter === 'airport') {
        typeMatch = !!confirmation.trip_id
      }
      
      return searchMatch && statusMatch && typeMatch
    })

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'status':
          const statusOrder = { 'pending': 0, 'accepted': 1, 'rejected': 2 }
          const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
          if (statusDiff !== 0) return statusDiff
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    return filtered
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading confirmations..." />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to Load Confirmations"
        message={error}
        onRetry={() => {
          clearError()
          fetchConfirmations()
        }}
        className="my-8"
      />
    )
  }

  if (!hasAnyConfirmations) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Ride Confirmations</h3>
        <p className="text-gray-600 mb-6">
          You don't have any ride confirmations yet. Start by posting a ride or requesting to join one!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Expiry Management Banner */}
      <ConfirmationExpiryBanner onRefresh={fetchConfirmations} />

      {/* Recent Action Alerts */}
      {recentActions.length > 0 && (
        <div className="space-y-4">
          {recentActions.map((confirmation) => (
            <AccidentalActionAlert
              key={confirmation.id}
              confirmation={confirmation}
              userId={user?.id || ''}
              onReverse={handleReverseAction}
              onDismiss={() => handleDismissAlert(confirmation.id)}
            />
          ))}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Success!</h4>
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2 sm:mb-0">All Ride Confirmations</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Filter size={16} />
            <span>Filters & Search</span>
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by passenger name..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="car">Car Rides</option>
                  <option value="airport">Airport Trips</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="status">By Status</option>
                </select>
              </div>
            </div>

            {/* Filter Stats */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">{stats.total}</div>
                  <div className="text-xs text-blue-800">Total</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-xs text-yellow-800">Pending</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{stats.accepted}</div>
                  <div className="text-xs text-green-800">Accepted</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">{stats.rejected}</div>
                  <div className="text-xs text-red-800">Rejected</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{stats.carRides}</div>
                  <div className="text-xs text-green-800">Car Rides</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{stats.airportTrips}</div>
                  <div className="text-xs text-blue-800">Airport Trips</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {(categorized.pending.carRides.length > 0 || categorized.pending.airportTrips.length > 0) && (
        <div>
          <div 
            className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-xl cursor-pointer hover:bg-yellow-100 transition-colors mb-4"
            onClick={() => toggleSection('pending')}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Pending Requests</h2>
              <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full font-medium">
                {categorized.pending.carRides.length + categorized.pending.airportTrips.length} requiring action
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-yellow-700 font-medium">
                {expandedSections.pending ? 'Hide Details' : 'Show Details'}
              </span>
              {expandedSections.pending ? (
                <ChevronUp size={20} className="text-yellow-600" />
              ) : (
                <ChevronDown size={20} className="text-yellow-600" />
              )}
            </div>
          </div>

          {expandedSections.pending && (
            <div className="mb-8">
              {/* Car Rides - Pending */}
              {categorized.pending.carRides.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Car size={20} className="text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Car Rides</h3>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {categorized.pending.carRides.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {categorized.pending.carRides.map((confirmation) => (
                      <div key={confirmation.id}>
                        <ConfirmationItem
                          confirmation={confirmation}
                          onUpdate={fetchConfirmations}
                          onStartChat={onStartChat}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Airport Trips - Pending */}
              {categorized.pending.airportTrips.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Plane size={20} className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Airport Trips</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {categorized.pending.airportTrips.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {categorized.pending.airportTrips.map((confirmation) => (
                      <div key={confirmation.id}>
                        <ConfirmationItem
                          confirmation={confirmation}
                          onUpdate={fetchConfirmations}
                          onStartChat={onStartChat}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
          )}
        </div>
      )}

      {/* Accepted Confirmations */}
      {(categorized.accepted.carRides.length > 0 || categorized.accepted.airportTrips.length > 0) && (
        <div>
          <div 
            className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer hover:bg-green-100 transition-colors mb-4"
            onClick={() => toggleSection('accepted')}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={20} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Accepted Confirmations</h2>
              <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium">
                {categorized.accepted.carRides.length + categorized.accepted.airportTrips.length} confirmed
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-green-700 font-medium">
                {expandedSections.accepted ? 'Hide Details' : 'Show Details'}
              </span>
              {expandedSections.accepted ? (
                <ChevronUp size={20} className="text-green-600" />
              ) : (
                <ChevronDown size={20} className="text-green-600" />
              )}
            </div>
          </div>

          {expandedSections.accepted && (
            <div className="mb-8">
              {/* Car Rides - Accepted */}
              {categorized.accepted.carRides.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Car size={20} className="text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Car Rides</h3>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {categorized.accepted.carRides.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {categorized.accepted.carRides.map((confirmation) => (
                      <ConfirmationItem
                        key={confirmation.id}
                        confirmation={confirmation}
                        onUpdate={fetchConfirmations}
                        onStartChat={onStartChat}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Airport Trips - Accepted */}
              {categorized.accepted.airportTrips.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Plane size={20} className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Airport Trips</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {categorized.accepted.airportTrips.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {categorized.accepted.airportTrips.map((confirmation) => (
                      <ConfirmationItem
                        key={confirmation.id}
                        confirmation={confirmation}
                        onUpdate={fetchConfirmations}
                        onStartChat={onStartChat}
                      />
                    ))}
                  </div>
                </div>
              )}
              </div>
          )}
        </div>
      )}

      {/* Rejected/Cancelled */}
      {(categorized.rejected.carRides.length > 0 || categorized.rejected.airportTrips.length > 0) && (
        <div>
          <div 
            className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl cursor-pointer hover:bg-red-100 transition-colors mb-4"
            onClick={() => toggleSection('rejected')}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <X size={20} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Rejected/Cancelled</h2>
              <span className="bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full font-medium">
                {categorized.rejected.carRides.length + categorized.rejected.airportTrips.length} declined
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-red-700 font-medium">
                {expandedSections.rejected ? 'Hide Details' : 'Show Details'}
              </span>
              {expandedSections.rejected ? (
                <ChevronUp size={20} className="text-red-600" />
              ) : (
                <ChevronDown size={20} className="text-red-600" />
              )}
            </div>
          </div>

          {expandedSections.rejected && (
            <div className="mb-8">
              {/* Info Banner for Rejected Confirmations */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <RefreshCw size={16} className="text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Request Again Options</h4>
                    <p className="text-sm text-blue-800">
                      For rejected requests, you can use "Request Again" to send a new request after the cooldown period (30 minutes). 
                      You can also use "Undo Rejection" within 24 hours if the rejection was accidental.
                    </p>
                  </div>
                </div>
              </div>

              {/* Car Rides - Rejected */}
              {categorized.rejected.carRides.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Car size={20} className="text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Car Rides</h3>
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      {categorized.rejected.carRides.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {categorized.rejected.carRides.map((confirmation) => (
                      <ConfirmationItem
                        key={confirmation.id}
                        confirmation={confirmation}
                        onUpdate={fetchConfirmations}
                        onStartChat={onStartChat}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Airport Trips - Rejected */}
              {categorized.rejected.airportTrips.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Plane size={20} className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Airport Trips</h3>
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      {categorized.rejected.airportTrips.length}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {categorized.rejected.airportTrips.map((confirmation) => (
                      <ConfirmationItem
                        key={confirmation.id}
                        confirmation={confirmation}
                        onUpdate={fetchConfirmations}
                        onStartChat={onStartChat}
                      />
                    ))}
                  </div>
                </div>
              )}
              </div>
          )}
        </div>
      )}
    </div>
  )
}