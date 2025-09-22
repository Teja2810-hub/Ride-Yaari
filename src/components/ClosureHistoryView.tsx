import React, { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, Clock, Car, Plane, MapPin, Lock, Search, Filter, RefreshCw, AlertTriangle, Archive } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getClosureHistory } from '../utils/tripClosureHelpers'
import { CarRide, Trip } from '../types'
import { getCurrencySymbol } from '../utils/currencies'
import { useErrorHandler } from '../hooks/useErrorHandler'
import ErrorMessage from './ErrorMessage'
import LoadingSpinner from './LoadingSpinner'

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
    
    // Get closure reasons stats
    const allItems = [...closedTrips, ...closedRides]
    const withReasons = allItems.filter(item => item.closed_reason).length
    const withoutReasons = total - withReasons

    return {
      total,
      totalTrips,
      totalRides,
      withReasons,
      withoutReasons
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
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchClosureHistory}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <span className="text-gray-600">{filteredItems.length} of {stats.total} items</span>
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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Closed</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalTrips}</div>
          <div className="text-sm text-gray-600">Airport Trips</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.totalRides}</div>
          <div className="text-sm text-gray-600">Car Rides</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.withReasons}</div>
          <div className="text-sm text-gray-600">With Reasons</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.withoutReasons}</div>
          <div className="text-sm text-gray-600">No Reason</div>
        </div>
      </div>

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

            return (
              <div
                key={data.id}
                className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isTrip ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {isTrip ? (
                        <Plane size={24} className="text-blue-600" />
                      ) : (
                        <Car size={24} className="text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {isTrip 
                          ? `${trip?.leaving_airport} → ${trip?.destination_airport}`
                          : `${ride?.from_location} → ${ride?.to_location}`
                        }
                      </h3>
                      <p className="text-sm text-gray-600">
                        {isTrip ? 'Airport Trip' : 'Car Ride'} • 
                        Closed on {data.closed_at ? formatDateTime(data.closed_at) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                      <Lock size={14} />
                      <span>Closed</span>
                    </div>
                    {isTrip ? (
                      <Plane size={20} className="text-blue-600" />
                    ) : (
                      <Car size={20} className="text-green-600" />
                    )}
                  </div>
                </div>

                {/* Trip/Ride Details */}
                <div className={`rounded-lg p-4 mb-4 ${
                  isTrip ? 'bg-blue-50' : 'bg-green-50'
                }`}>
                  {isTrip && trip && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">From</p>
                        <div className="font-medium text-gray-900">{trip.leaving_airport}</div>
                        {trip.departure_time && (
                          <div className="text-sm text-gray-600 flex items-center mt-1">
                            <Clock size={12} className="mr-1" />
                            {trip.departure_time}
                            {trip.departure_timezone && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({trip.departure_timezone})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">To</p>
                        <div className="font-medium text-gray-900">{trip.destination_airport}</div>
                        {trip.landing_time && (
                          <div className="text-sm text-gray-600 flex items-center mt-1">
                            <Clock size={12} className="mr-1" />
                            {trip.landing_time}
                            {trip.landing_timezone && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({trip.landing_timezone})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Travel Date</p>
                        <div className="font-medium text-gray-900 flex items-center">
                          <Calendar size={14} className="mr-1 text-gray-400" />
                          {formatDate(trip.travel_date)}
                        </div>
                        {trip.landing_date && trip.landing_date !== trip.travel_date && (
                          <div className="text-sm text-gray-600 mt-1">
                            Landing: {formatDate(trip.landing_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isTrip && ride && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">From</p>
                        <div className="font-medium text-gray-900 flex items-center">
                          <MapPin size={14} className="mr-1 text-gray-400" />
                          {ride.from_location}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">To</p>
                        <div className="font-medium text-gray-900 flex items-center">
                          <MapPin size={14} className="mr-1 text-gray-400" />
                          {ride.to_location}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Departure</p>
                        <div className="font-medium text-gray-900 flex items-center">
                          <Clock size={14} className="mr-1 text-gray-400" />
                          {formatDateTime(ride.departure_date_time)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price Information */}
                  {((isTrip && trip?.price) || (!isTrip && ride?.price)) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-sm font-medium text-green-600">
                        {isTrip ? 'Service Price: ' : 'Price: '}
                        {getCurrencySymbol((trip?.currency || ride?.currency) || 'USD')}
                        {trip?.price || ride?.price}
                        {((trip?.negotiable || ride?.negotiable)) && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                            Negotiable
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Closure Information */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <Lock size={16} className="text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 mb-2">Closure Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-red-700 mb-1">Closed On</p>
                          <p className="font-medium text-red-900">
                            {data.closed_at ? formatDateTime(data.closed_at) : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-red-700 mb-1">Reason</p>
                          <p className="font-medium text-red-900">
                            {data.closed_reason || 'No reason provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {isTrip ? 'Trip' : 'Ride'} Created
                        </p>
                        <p className="text-xs text-gray-600">{formatDateTime(data.created_at)}</p>
                      </div>
                    </div>
                    
                    {data.closed_at && (
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 font-bold text-xs">2</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {isTrip ? 'Trip' : 'Ride'} Closed
                          </p>
                          <p className="text-xs text-gray-600">{formatDateTime(data.closed_at)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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