import React, { useState, useEffect } from 'react'
import { ArrowLeft, Archive, Car, Plane, Calendar, Clock, Unlock, Search, Filter, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getClosureHistory, reopenTrip, reopenRide } from '../utils/tripClosureHelpers'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { CarRide, Trip } from '../types'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import { getCurrencySymbol } from '../utils/currencies'

interface ClosureHistoryViewProps {
  onBack: () => void
}

type FilterType = 'all' | 'trips' | 'rides'
type SortOption = 'closed-desc' | 'closed-asc' | 'travel-desc' | 'travel-asc'

export default function ClosureHistoryView({ onBack }: ClosureHistoryViewProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [closedTrips, setClosedTrips] = useState<Trip[]>([])
  const [closedRides, setClosedRides] = useState<CarRide[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('closed-desc')
  const [reopeningId, setReopeningId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (user) {
      fetchClosureHistory()
    }
  }, [user])

  const fetchClosureHistory = async () => {
    if (!user) return

    await handleAsync(async () => {
      const history = await getClosureHistory(user.id)
      setClosedTrips(history.closedTrips)
      setClosedRides(history.closedRides)
    })
  }

  const handleReopen = async (item: Trip | CarRide, type: 'trip' | 'ride') => {
    if (!user) return


    console.log(`Attempting to reopen ${type}:`, item.id)
    setReopeningId(item.id)

    await handleAsync(async () => {
      let result
      if (type === 'trip') {
        console.log('Calling reopenTrip with:', item.id, user.id)
        result = await reopenTrip(item.id, user.id)
      } else {
        console.log('Calling reopenRide with:', item.id, user.id)
        result = await reopenRide(item.id, user.id)
      }
      
      console.log('Reopen result:', result)
      if (!result.success) {
        throw new Error(result.error || `Failed to reopen ${type}`)
      }

      console.log(`${type} reopened successfully, updating local state`)
      // Remove from local state
      if (type === 'trip') {
        setClosedTrips(prev => prev.filter(t => t.id !== item.id))
      } else {
        setClosedRides(prev => prev.filter(r => r.id !== item.id))
      }
      
      // Show success message in UI
      setSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} reopened successfully! It will now appear in search results.`)
      setTimeout(() => setSuccessMessage(''), 5000)
    }).finally(() => {
      setReopeningId(null)
    })
  }

  const showReopenConfirmation = (item: Trip | CarRide, type: 'trip' | 'ride') => {
    const confirmMessage = `Are you sure you want to reopen this ${type}? It will become visible in search results again.`
    if (confirm(confirmMessage)) {
      handleReopen(item, type)
    }
  }
  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getFilteredAndSortedItems = () => {
    let items: Array<{ item: Trip | CarRide; type: 'trip' | 'ride' }> = []

    if (filterType === 'all' || filterType === 'trips') {
      items.push(...closedTrips.map(trip => ({ item: trip, type: 'trip' as const })))
    }

    if (filterType === 'all' || filterType === 'rides') {
      items.push(...closedRides.map(ride => ({ item: ride, type: 'ride' as const })))
    }

    // Apply search filter
    if (searchTerm) {
      items = items.filter(({ item, type }) => {
        if (type === 'trip') {
          const trip = item as Trip
          return trip.leaving_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 trip.destination_airport.toLowerCase().includes(searchTerm.toLowerCase())
        } else {
          const ride = item as CarRide
          return ride.from_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 ride.to_location.toLowerCase().includes(searchTerm.toLowerCase())
        }
      })
    }

    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'closed-desc':
          return new Date(b.item.closed_at || '').getTime() - new Date(a.item.closed_at || '').getTime()
        case 'closed-asc':
          return new Date(a.item.closed_at || '').getTime() - new Date(b.item.closed_at || '').getTime()
        case 'travel-desc':
          const aDate = a.type === 'trip' ? (a.item as Trip).travel_date : (a.item as CarRide).departure_date_time
          const bDate = b.type === 'trip' ? (b.item as Trip).travel_date : (b.item as CarRide).departure_date_time
          return new Date(bDate).getTime() - new Date(aDate).getTime()
        case 'travel-asc':
          const aDateAsc = a.type === 'trip' ? (a.item as Trip).travel_date : (a.item as CarRide).departure_date_time
          const bDateAsc = b.type === 'trip' ? (b.item as Trip).travel_date : (b.item as CarRide).departure_date_time
          return new Date(aDateAsc).getTime() - new Date(bDateAsc).getTime()
        default:
          return 0
      }
    })

    return items
  }

  const filteredItems = getFilteredAndSortedItems()

  if (isLoading && closedTrips.length === 0 && closedRides.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading closure history..." />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-3">
            <Archive size={24} className="text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-900">Closure History</h2>
          </div>
        </div>
        <span className="text-gray-600">{filteredItems.length} closed</span>
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={clearError}
          onDismiss={clearError}
          className="mb-6"
        />
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle size={20} className="text-green-600" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        </div>
      )}
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{closedTrips.length + closedRides.length}</div>
          <div className="text-sm text-gray-600">Total Closed</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{closedTrips.length}</div>
          <div className="text-sm text-gray-600">Closed Trips</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{closedRides.length}</div>
          <div className="text-sm text-gray-600">Closed Rides</div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by location..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="all">All Types</option>
              <option value="trips">Airport Trips Only</option>
              <option value="rides">Car Rides Only</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="closed-desc">Recently Closed</option>
              <option value="closed-asc">Oldest Closed</option>
              <option value="travel-desc">Latest Travel Date</option>
              <option value="travel-asc">Earliest Travel Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-start space-x-3">
          <Archive size={20} className="text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">About Closure History</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Closed trips/rides don't appear in search results</li>
              <li>• No new passengers can request to join closed items</li>
              <li>• You can reopen future trips/rides anytime</li>
              <li>• Past trips/rides cannot be reopened</li>
              <li>• Closure history is kept for your records</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Closure History List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {closedTrips.length === 0 && closedRides.length === 0 ? 'No Closed Items' : 'No Matching Items'}
          </h3>
          <p className="text-gray-600">
            {closedTrips.length === 0 && closedRides.length === 0 
              ? 'You haven\'t closed any trips or rides yet.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(({ item, type }) => {
            const isPast = type === 'trip' 
              ? new Date((item as Trip).travel_date) <= new Date()
              : new Date((item as CarRide).departure_date_time) <= new Date()

            return (
              <div
                key={item.id}
                className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      type === 'trip' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {type === 'trip' ? (
                        <Plane size={24} className="text-blue-600" />
                      ) : (
                        <Car size={24} className="text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {type === 'trip' 
                          ? `${(item as Trip).leaving_airport} → ${(item as Trip).destination_airport}`
                          : `${(item as CarRide).from_location} → ${(item as CarRide).to_location}`
                        }
                      </h3>
                      <p className="text-sm text-gray-600">
                        {type === 'trip' 
                          ? formatDate((item as Trip).travel_date)
                          : formatDateTime((item as CarRide).departure_date_time)
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                      <Archive size={14} />
                      <span>Closed</span>
                    </div>
                    
                    {!isPast && (
                      <button
                        onClick={() => showReopenConfirmation(item, type)}
                        disabled={reopeningId === item.id}
                        className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
                      >
                        {reopeningId === item.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Reopening...</span>
                          </>
                        ) : (
                          <>
                            <Unlock size={14} />
                            <span>Reopen</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Closed On</p>
                      <div className="font-medium text-gray-900 flex items-center">
                        <Calendar size={14} className="mr-1 text-gray-400" />
                        {formatDateTime(item.closed_at || '')}
                      </div>
                    </div>
                    
                    {type === 'trip' && (item as Trip).price && (
                      <div>
                        <p className="text-gray-600 mb-1">Service Price</p>
                        <div className="font-medium text-green-600">
                          {getCurrencySymbol((item as Trip).currency || 'USD')}{(item as Trip).price}
                        </div>
                      </div>
                    )}
                    
                    {type === 'ride' && (
                      <div>
                        <p className="text-gray-600 mb-1">Price per Passenger</p>
                        <div className="font-medium text-green-600">
                          {getCurrencySymbol((item as CarRide).currency || 'USD')}{(item as CarRide).price}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-gray-600 mb-1">Status</p>
                      <div className={`font-medium ${isPast ? 'text-gray-500' : 'text-orange-600'}`}>
                        {isPast ? 'Past & Closed' : 'Closed (Can Reopen)'}
                      </div>
                    </div>
                  </div>

                  {item.closed_reason && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-600 mb-1">Closure Reason</p>
                      <p className="text-sm text-gray-700">{item.closed_reason}</p>
                    </div>
                  )}
                </div>

                {isPast && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle size={14} className="text-yellow-600" />
                      <p className="text-sm text-yellow-800">
                        This {type} is in the past and cannot be reopened.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
  function showReopenConfirmation(item: Trip | CarRide, type: 'trip' | 'ride') {
    const confirmMessage = `Are you sure you want to reopen this ${type}? It will become visible in search results again.`
    if (confirm(confirmMessage)) {
      handleReopen(item, type)
    }
  }