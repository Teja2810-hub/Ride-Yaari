import React, { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, Clock, Car, Plane, MapPin, Lock, Search, ListFilter as Filter, RefreshCw, TriangleAlert as AlertTriangle, Archive, Clock as Unlock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getClosureHistory, reopenTrip, reopenRide } from '../utils/tripClosureHelpers'
import { CarRide, Trip } from '../types'
import { getCurrencySymbol } from '../utils/currencies'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'
import { formatDateSafe, formatDateTimeSafe } from '../utils/dateHelpers'

interface ClosureHistoryViewProps {
  onBack: () => void
}

type FilterType = 'all' | 'trips' | 'rides'
type SortOption = 'date-desc' | 'date-asc' | 'type'

export default function ClosureHistoryView({ onBack }: ClosureHistoryViewProps) {
  const { user } = useAuth()
  const { error, isLoading, handleAsync, clearError } = useErrorHandler()
  const [closedTrips, setClosedTrips] = useState<Trip[]>([])
  const [closedRides, setClosedRides] = useState<CarRide[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [reopeningId, setReopeningId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchClosureHistory()
    }
  }, [user])

  const fetchClosureHistory = async () => {
    if (!user) return

    await handleAsync(async () => {
      const result = await getClosureHistory(user.id)
      setClosedTrips(result.closedTrips)
      setClosedRides(result.closedRides)
    })
  }


  const getFilteredAndSortedItems = () => {
    let items: Array<{ type: 'trip' | 'ride'; data: Trip | CarRide }> = []

    // Add trips
    if (filterType === 'all' || filterType === 'trips') {
      items.push(...closedTrips.map(trip => ({ type: 'trip' as const, data: trip })))
    }

    // Add rides
    if (filterType === 'all' || filterType === 'rides') {
      items.push(...closedRides.map(ride => ({ type: 'ride' as const, data: ride })))
    }

    // Apply search filter
    if (searchTerm) {
      items = items.filter(item => {
        const data = item.data
        const searchLower = searchTerm.toLowerCase()
        
        if (item.type === 'trip') {
          const trip = data as Trip
          return (
            trip.leaving_airport.toLowerCase().includes(searchLower) ||
            trip.destination_airport.toLowerCase().includes(searchLower) ||
            trip.closed_reason?.toLowerCase().includes(searchLower)
          )
        } else {
          const ride = data as CarRide
          return (
            ride.from_location.toLowerCase().includes(searchLower) ||
            ride.to_location.toLowerCase().includes(searchLower) ||
            ride.closed_reason?.toLowerCase().includes(searchLower)
          )
        }
      })
    }

    // Apply sorting
    items.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.data.closed_at || '').getTime() - new Date(b.data.closed_at || '').getTime()
        case 'date-desc':
          return new Date(b.data.closed_at || '').getTime() - new Date(a.data.closed_at || '').getTime()
        case 'type':
          if (a.type !== b.type) {
            return a.type === 'trip' ? -1 : 1
          }
          return new Date(b.data.closed_at || '').getTime() - new Date(a.data.closed_at || '').getTime()
        default:
          return 0
      }
    })

    return items
  }

  const getStats = () => {
    const totalTrips = closedTrips.length
    const totalRides = closedRides.length
    const total = totalTrips + totalRides

    return {
      total
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading closure history..." />
      </div>
    )
  }

  const filteredItems = getFilteredAndSortedItems()
  const stats = getStats()

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleReopen = async (itemId: string, itemType: 'trip' | 'ride') => {
    if (!user) return

    setReopeningId(itemId)
    await handleAsync(async () => {
      let result
      if (itemType === 'trip') {
        result = await reopenTrip(itemId, user.id)
      } else {
        result = await reopenRide(itemId, user.id)
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to reopen')
      }

      await fetchClosureHistory()
    })
    setReopeningId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 md:space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm md:text-base"
          >
            <ArrowLeft size={16} className="md:w-5 md:h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-2 md:space-x-3">
            <Archive size={20} className="text-gray-600 md:w-6 md:h-6" />
            <h2 className="text-lg md:text-2xl font-bold text-gray-900">Closure History</h2>
          </div>
        </div>
        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            onClick={fetchClosureHistory}
            disabled={isLoading}
            className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-1 md:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-xs md:text-sm"
          >
            <RefreshCw size={14} className={`${isLoading ? 'animate-spin' : ''} md:w-4 md:h-4`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <span className="text-xs md:text-sm text-gray-600">{filteredItems.length}/{stats.total}</span>
        </div>
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={() => {
            clearError()
            fetchClosureHistory()
          }}
          onDismiss={clearError}
          className="mb-6"
        />
      )}


      {/* Search and Filter Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">Filter & Search</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Filter size={16} />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
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
                placeholder="Search by location or closure reason..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as FilterType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="trips">Airport Trips</option>
                  <option value="rides">Car Rides</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="type">By Type</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Closure History List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {stats.total === 0 ? 'No Closed Items' : 'No Matching Items'}
          </h3>
          <p className="text-gray-600">
            {stats.total === 0 
              ? 'You haven\'t closed any trips or rides yet.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isTrip = item.type === 'trip'
            const data = item.data
            const trip = isTrip ? data as Trip : undefined
            const ride = !isTrip ? data as CarRide : undefined

            const isExpanded = expandedItems.has(data.id)
            const isPast = ride
              ? new Date(ride.departure_date_time) <= new Date()
              : trip
                ? (() => {
                    const [year, month, day] = trip.travel_date.split('-').map(Number)
                    return new Date(year, month - 1, day) <= new Date()
                  })()
                : false

            return (
              <div
                key={data.id}
                className="border border-gray-200 rounded-xl p-3 md:p-6 hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => toggleExpanded(data.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
                      <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 ${
                        isTrip ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {isTrip ? (
                          <Plane size={16} className="text-blue-600 md:w-6 md:h-6" />
                        ) : (
                          <Car size={16} className="text-green-600 md:w-6 md:h-6" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm md:text-lg font-semibold text-gray-900 truncate">
                          {isTrip
                            ? `${trip?.leaving_airport} → ${trip?.destination_airport}`
                            : `${ride?.from_location} → ${ride?.to_location}`
                          }
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600 truncate">
                          {isTrip ? 'Trip' : 'Ride'} • {data.closed_at ? formatDateSafe(data.closed_at.split('T')[0]) : 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 md:space-x-3 shrink-0">
                      <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-medium">
                        <Lock size={10} className="md:w-3.5 md:h-3.5" />
                        <span className="hidden sm:inline">Closed</span>
                      </div>
                      {!isPast && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReopen(data.id, isTrip ? 'trip' : 'ride')
                          }}
                          disabled={reopeningId === data.id}
                          className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 text-xs"
                        >
                          <Unlock size={10} className="md:w-3.5 md:h-3.5" />
                          <span className="hidden sm:inline">{reopeningId === data.id ? 'Reopening...' : 'Reopen'}</span>
                          <span className="sm:hidden">{reopeningId === data.id ? '...' : '↻'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expandable Details */}
                {isExpanded && (
                  <div className="mt-3 md:mt-4 space-y-3 md:space-y-4">
                    {/* Trip/Ride Details */}
                    <div className={`rounded-lg p-3 md:p-4 ${
                      isTrip ? 'bg-blue-50' : 'bg-green-50'
                    }`}>
                      {isTrip && trip && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                          <div>
                            <p className="text-xs md:text-sm text-gray-600 mb-1">From</p>
                            <div className="font-medium text-sm md:text-base text-gray-900">{trip.leaving_airport}</div>
                            {trip.departure_time && (
                              <div className="text-xs md:text-sm text-gray-600 flex items-center mt-1">
                                <Clock size={10} className="mr-1 md:w-3 md:h-3" />
                                {trip.departure_time}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-gray-600 mb-1">To</p>
                            <div className="font-medium text-sm md:text-base text-gray-900">{trip.destination_airport}</div>
                            {trip.landing_time && (
                              <div className="text-xs md:text-sm text-gray-600 flex items-center mt-1">
                                <Clock size={10} className="mr-1 md:w-3 md:h-3" />
                                {trip.landing_time}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-gray-600 mb-1">Date</p>
                            <div className="font-medium text-sm md:text-base text-gray-900 flex items-center">
                              <Calendar size={10} className="mr-1 text-gray-400 md:w-3.5 md:h-3.5" />
                              {formatDateSafe(trip.travel_date)}
                            </div>
                          </div>
                        </div>
                      )}

                      {!isTrip && ride && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                          <div>
                            <p className="text-xs md:text-sm text-gray-600 mb-1">From</p>
                            <div className="font-medium text-sm md:text-base text-gray-900 flex items-center">
                              <MapPin size={10} className="mr-1 text-gray-400 md:w-3.5 md:h-3.5" />
                              <span className="truncate">{ride.from_location}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-gray-600 mb-1">To</p>
                            <div className="font-medium text-sm md:text-base text-gray-900 flex items-center">
                              <MapPin size={10} className="mr-1 text-gray-400 md:w-3.5 md:h-3.5" />
                              <span className="truncate">{ride.to_location}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-gray-600 mb-1">Departure</p>
                            <div className="font-medium text-sm md:text-base text-gray-900 flex items-center">
                              <Clock size={10} className="mr-1 text-gray-400 md:w-3.5 md:h-3.5" />
                              {formatDateSafe(ride.departure_date_time.split('T')[0])}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Price Information */}
                      {((isTrip && trip?.price) || (!isTrip && ride?.price)) && (
                        <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200">
                          <span className="text-xs md:text-sm font-medium text-green-600">
                            Price: {getCurrencySymbol((trip?.currency || ride?.currency) || 'USD')}{trip?.price || ride?.price}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Closure Information */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4">
                      <div className="flex items-start space-x-2 md:space-x-3">
                        <Lock size={14} className="text-red-600 mt-0.5 md:w-4 md:h-4" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs md:text-sm text-red-900 mb-2">Closure Details</h4>
                          <div className="space-y-2 text-xs md:text-sm">
                            <div>
                              <p className="text-red-700 mb-1">Closed: {data.closed_at ? formatDateSafe(data.closed_at.split('T')[0]) : 'Unknown'}</p>
                            </div>
                            {data.closed_reason && (
                              <div>
                                <p className="text-red-700 mb-1">Reason:</p>
                                <p className="font-medium text-red-900">{data.closed_reason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                      <h4 className="font-semibold text-xs md:text-sm text-gray-900 mb-2 md:mb-3">Timeline</h4>
                      <div className="space-y-2 md:space-y-3">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <div className="w-5 h-5 md:w-6 md:h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-blue-600 font-bold text-xs">1</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs md:text-sm font-medium text-gray-900">Created</p>
                            <p className="text-xs text-gray-600">{formatDateSafe(data.created_at.split('T')[0])}</p>
                          </div>
                        </div>

                        {data.closed_at && (
                          <div className="flex items-center space-x-2 md:space-x-3">
                            <div className="w-5 h-5 md:w-6 md:h-6 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-red-600 font-bold text-xs">2</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs md:text-sm font-medium text-gray-900">Closed</p>
                              <p className="text-xs text-gray-600">{formatDateSafe(data.closed_at.split('T')[0])}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Information Panel */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4">📋 About Closure History</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Why Close Trips/Rides?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Prevent new passenger requests</li>
              <li>• Remove from search results</li>
              <li>• Maintain existing confirmed passengers</li>
              <li>• Keep historical record for reference</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Closure Benefits</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Better control over your rides/trips</li>
              <li>• Reduce unwanted requests</li>
              <li>• Maintain professional reputation</li>
              <li>• Can reopen if plans change</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>💡 Pro Tip:</strong> You can reopen closed trips/rides from your profile if your plans change. 
            Closed items maintain all their history and confirmed passengers.
          </p>
        </div>
      </div>
    </div>
  )
}